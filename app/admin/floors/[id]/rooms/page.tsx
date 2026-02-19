"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import toast, { Toaster } from "react-hot-toast";

type Point = {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
};

type Room = {
  id: string;
  name: string;
  roomNumber: string;
  floorId: string;
  polygonJson: string;
};

type Floor = {
  id: string;
  name: string;
  blueprintImageUrl: string | null;
  blueprintWidthPx: number | null;
  blueprintHeightPx: number | null;
  building: {
    id: string;
    name: string;
  };
};

type CanvasState = {
  scale: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
  initialPinchDistance: number | null;
  initialPinchScale: number;
};

const COLORS = [
  "rgba(59, 130, 246, 0.5)", // blue
  "rgba(16, 185, 129, 0.5)", // green
  "rgba(245, 158, 11, 0.5)", // yellow
  "rgba(239, 68, 68, 0.5)",  // red
  "rgba(168, 85, 247, 0.5)", // purple
  "rgba(236, 72, 153, 0.5)", // pink
  "rgba(14, 165, 233, 0.5)", // cyan
  "rgba(251, 146, 60, 0.5)", // orange
];

export default function RoomsManagementPage() {
  const params = useParams();
  const floorId = params.id as string;
  const router = useRouter();

  const [floor, setFloor] = useState<Floor | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    roomNumber: "",
    name: "",
  });

  // Canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [canvasState, setCanvasState] = useState<CanvasState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    lastMouseX: 0,
    lastMouseY: 0,
    initialPinchDistance: null,
    initialPinchScale: 1,
  });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPolygon, setCurrentPolygon] = useState<Point[]>([]);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorId]);

  const loadData = async () => {
    try {
      const [floorRes, roomsRes] = await Promise.all([
        fetch(`/api/floors/${floorId}`),
        fetch(`/api/rooms?floorId=${floorId}`),
      ]);

      if (!floorRes.ok || !roomsRes.ok) {
        if (floorRes.status === 401 || roomsRes.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch data");
      }

      const [floorData, roomsData] = await Promise.all([
        floorRes.json(),
        roomsRes.json(),
      ]);

      setFloor(floorData);
      setRooms(roomsData);
      
      // Load blueprint image
      if (floorData.blueprintImageUrl) {
        const img = new Image();
        img.src = floorData.blueprintImageUrl;
        img.onload = () => {
          imageRef.current = img;
          drawCanvas();
        };
      }
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imageRef.current;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transformations
    ctx.save();
    ctx.translate(canvasState.offsetX, canvasState.offsetY);
    ctx.scale(canvasState.scale, canvasState.scale);
    
    // Draw blueprint
    ctx.drawImage(img, 0, 0, img.width, img.height);
    
    // Draw existing room polygons
    rooms.forEach((room, index) => {
      try {
        const points: Point[] = JSON.parse(room.polygonJson);
        if (points.length === 0) return;

        const color = COLORS[index % COLORS.length];
        const isHovered = hoveredRoomId === room.id;
        const isEditing = editingRoomId === room.id;
        
        ctx.beginPath();
        points.forEach((point, i) => {
          const x = point.x * img.width;
          const y = point.y * img.height;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        
        // Fill
        ctx.fillStyle = isHovered || isEditing ? color.replace("0.5", "0.7") : color;
        ctx.fill();
        
        // Stroke
        ctx.strokeStyle = isEditing ? "#ef4444" : isHovered ? "#3b82f6" : "#1f2937";
        ctx.lineWidth = isEditing ? 3 : isHovered ? 2 : 1;
        ctx.stroke();
        
        // Draw points
        if (isEditing) {
          points.forEach((point) => {
            const x = point.x * img.width;
            const y = point.y * img.height;
            ctx.beginPath();
            ctx.arc(x, y, 5 / canvasState.scale, 0, 2 * Math.PI);
            ctx.fillStyle = "#ef4444";
            ctx.fill();
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2 / canvasState.scale;
            ctx.stroke();
          });
        }
        
        // Draw label
        const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length * img.width;
        const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length * img.height;
        
        ctx.fillStyle = "#1f2937";
        ctx.font = `${14 / canvasState.scale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(room.roomNumber, centerX, centerY);
      } catch (e) {
        console.error("Error drawing room polygon:", e);
      }
    });
    
    // Draw current polygon being drawn
    if (isDrawing && currentPolygon.length > 0) {
      ctx.beginPath();
      currentPolygon.forEach((point, i) => {
        const x = point.x * img.width;
        const y = point.y * img.height;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Draw point
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 4 / canvasState.scale, 0, 2 * Math.PI);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2 / canvasState.scale;
        ctx.stroke();
        ctx.restore();
      });
      
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Show closing hint if 3+ points
      if (currentPolygon.length >= 3) {
        const firstPoint = currentPolygon[0];
        const x = firstPoint.x * img.width;
        const y = firstPoint.y * img.height;
        
        ctx.beginPath();
        ctx.arc(x, y, 8 / canvasState.scale, 0, 2 * Math.PI);
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 3 / canvasState.scale;
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }, [canvasState, rooms, currentPolygon, isDrawing, hoveredRoomId, editingRoomId]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return null;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - canvasState.offsetX) / canvasState.scale;
    const y = (e.clientY - rect.top - canvasState.offsetY) / canvasState.scale;
    
    return {
      x: x / img.width,
      y: y / img.height,
    };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !imageRef.current) return;

    const point = getCanvasPoint(e);
    if (!point) return;

    // Check if clicking near first point to close polygon
    if (currentPolygon.length >= 3) {
      const firstPoint = currentPolygon[0];
      const dx = (point.x - firstPoint.x) * imageRef.current.width;
      const dy = (point.y - firstPoint.y) * imageRef.current.height;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 15 / canvasState.scale) {
        // Close polygon
        finishDrawing();
        return;
      }
    }

    // Add point to polygon
    setCurrentPolygon([...currentPolygon, point]);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing) return;

    setCanvasState({
      ...canvasState,
      isDragging: true,
      lastMouseX: e.clientX,
      lastMouseY: e.clientY,
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (canvasState.isDragging && !isDrawing) {
      const dx = e.clientX - canvasState.lastMouseX;
      const dy = e.clientY - canvasState.lastMouseY;
      
      setCanvasState({
        ...canvasState,
        offsetX: canvasState.offsetX + dx,
        offsetY: canvasState.offsetY + dy,
        lastMouseX: e.clientX,
        lastMouseY: e.clientY,
      });
    } else if (!isDrawing && imageRef.current) {
      // Check if hovering over a room
      const point = getCanvasPoint(e);
      if (!point) return;
      
      const px = point.x * imageRef.current.width;
      const py = point.y * imageRef.current.height;
      
      let found = false;
      for (const room of rooms) {
        try {
          const points: Point[] = JSON.parse(room.polygonJson);
          if (isPointInPolygon({ x: px, y: py }, points.map(p => ({
            x: p.x * imageRef.current!.width,
            y: p.y * imageRef.current!.height,
          })))) {
            setHoveredRoomId(room.id);
            found = true;
            break;
          }
        } catch {
          // Ignore invalid polygons
        }
      }
      
      if (!found) {
        setHoveredRoomId(null);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    setCanvasState({
      ...canvasState,
      isDragging: false,
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(10, canvasState.scale * delta));
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const newOffsetX = mouseX - (mouseX - canvasState.offsetX) * (newScale / canvasState.scale);
    const newOffsetY = mouseY - (mouseY - canvasState.offsetY) * (newScale / canvasState.scale);
    
    setCanvasState({
      ...canvasState,
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  };

  const isPointInPolygon = (point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPolygon([]);
    setEditingRoomId(null);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setCurrentPolygon([]);
  };

  const finishDrawing = () => {
    if (currentPolygon.length < 3) {
      toast.error("Polygon must have at least 3 points");
      return;
    }
    
    setIsDrawing(false);
    // Polygon is stored in currentPolygon - will be used when saving the room
  };

  const handleZoomIn = () => {
    setCanvasState({
      ...canvasState,
      scale: Math.min(10, canvasState.scale * 1.2),
    });
  };

  const handleZoomOut = () => {
    setCanvasState({
      ...canvasState,
      scale: Math.max(0.1, canvasState.scale * 0.8),
    });
  };

  const handleResetView = () => {
    setCanvasState({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      initialPinchDistance: null,
      initialPinchScale: 1,
    });
  };

  // Touch event handlers for mobile pinch-zoom
  const getTouchDistance = (touches: React.TouchList): number => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const distance = getTouchDistance(e.touches);
      setCanvasState({
        ...canvasState,
        initialPinchDistance: distance,
        initialPinchScale: canvasState.scale,
      });
    } else if (e.touches.length === 1 && !isDrawing) {
      // Pan
      setCanvasState({
        ...canvasState,
        isDragging: true,
        lastMouseX: e.touches[0].clientX,
        lastMouseY: e.touches[0].clientY,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2 && canvasState.initialPinchDistance) {
      // Pinch zoom
      e.preventDefault();
      const distance = getTouchDistance(e.touches);
      const scale = (distance / canvasState.initialPinchDistance) * canvasState.initialPinchScale;
      const newScale = Math.max(0.1, Math.min(10, scale));
      
      setCanvasState({
        ...canvasState,
        scale: newScale,
      });
    } else if (e.touches.length === 1 && canvasState.isDragging && !isDrawing) {
      // Pan
      const dx = e.touches[0].clientX - canvasState.lastMouseX;
      const dy = e.touches[0].clientY - canvasState.lastMouseY;
      
      setCanvasState({
        ...canvasState,
        offsetX: canvasState.offsetX + dx,
        offsetY: canvasState.offsetY + dy,
        lastMouseX: e.touches[0].clientX,
        lastMouseY: e.touches[0].clientY,
      });
    }
  };

  const handleTouchEnd = () => {
    setCanvasState({
      ...canvasState,
      isDragging: false,
      initialPinchDistance: null,
    });
  };

  const openAddModal = () => {
    setSelectedRoom(null);
    setFormData({ roomNumber: "", name: "" });
    setCurrentPolygon([]);
    setShowModal(true);
  };

  const openEditModal = (room: Room) => {
    setSelectedRoom(room);
    setFormData({
      roomNumber: room.roomNumber,
      name: room.name,
    });
    
    try {
      const points: Point[] = JSON.parse(room.polygonJson);
      setCurrentPolygon(points);
    } catch {
      setCurrentPolygon([]);
    }
    
    setEditingRoomId(room.id);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (currentPolygon.length < 3) {
      toast.error("Please draw a room polygon with at least 3 points");
      return;
    }

    try {
      const url = selectedRoom
        ? `/api/rooms/${selectedRoom.id}`
        : "/api/rooms";
      const method = selectedRoom ? "PATCH" : "POST";

      const body = {
        floorId,
        name: formData.name,
        roomNumber: formData.roomNumber,
        polygonJson: JSON.stringify(currentPolygon),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Failed to save room");
      }

      toast.success(selectedRoom ? "Room updated!" : "Room created!");
      setShowModal(false);
      setSelectedRoom(null);
      setFormData({ roomNumber: "", name: "" });
      setCurrentPolygon([]);
      setEditingRoomId(null);
      loadData();
    } catch (error) {
      toast.error("Failed to save room");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this room?")) {
      return;
    }

    try {
      const res = await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete room");
      }

      toast.success("Room deleted!");
      loadData();
    } catch (error) {
      toast.error("Failed to delete room");
      console.error(error);
    }
  };

  const handleCanvasRoomClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing || !imageRef.current) return;
    
    const point = getCanvasPoint(e);
    if (!point) return;
    
    const px = point.x * imageRef.current.width;
    const py = point.y * imageRef.current.height;
    
    for (const room of rooms) {
      try {
        const points: Point[] = JSON.parse(room.polygonJson);
        if (isPointInPolygon({ x: px, y: py }, points.map(p => ({
          x: p.x * imageRef.current!.width,
          y: p.y * imageRef.current!.height,
        })))) {
          openEditModal(room);
          break;
        }
      } catch {
        // Ignore invalid polygons
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading rooms...</div>
      </div>
    );
  }

  if (!floor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Floor not found</div>
      </div>
    );
  }

  if (!floor.blueprintImageUrl) {
    return (
      <div className="p-6">
        <Toaster position="top-right" />
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/floors")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Floors
          </button>
        </div>
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Please upload a blueprint image for this floor before managing rooms.
          </p>
          <button
            onClick={() => router.push("/admin/floors")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Floors
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/floors")}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {floor.name} - Rooms
              </h1>
              <p className="text-gray-600 text-sm">{floor.building.name}</p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Room
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 relative bg-gray-100">
          <canvas
            ref={canvasRef}
            width={floor.blueprintWidthPx || 800}
            height={floor.blueprintHeightPx || 600}
            className="absolute inset-0 w-full h-full cursor-move touch-none"
            onClick={isDrawing ? handleCanvasClick : handleCanvasRoomClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          
          {/* Controls Overlay */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button
              onClick={handleZoomIn}
              className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50"
              title="Zoom In"
            >
              <MagnifyingGlassPlusIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomOut}
              className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50"
              title="Zoom Out"
            >
              <MagnifyingGlassMinusIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleResetView}
              className="bg-white px-3 py-2 rounded-lg shadow-md hover:bg-gray-50 text-sm"
              title="Reset View"
            >
              Reset
            </button>
          </div>

          {/* Drawing Controls */}
          {isDrawing && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 flex items-center gap-4">
              <p className="text-sm text-gray-600">
                Click to add points • Click near first point to close polygon
              </p>
              <div className="flex gap-2">
                {currentPolygon.length >= 3 && (
                  <button
                    onClick={finishDrawing}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <CheckIcon className="w-5 h-5" />
                    Finish
                  </button>
                )}
                <button
                  onClick={cancelDrawing}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  <XMarkIcon className="w-5 h-5" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Zoom Level Indicator */}
          <div className="absolute bottom-4 right-4 bg-white px-3 py-2 rounded-lg shadow-md text-sm">
            {Math.round(canvasState.scale * 100)}%
          </div>
        </div>

        {/* Rooms List Sidebar */}
        <div className="w-80 bg-white border-l overflow-y-auto flex-shrink-0">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">
              Rooms ({rooms.length})
            </h2>
            
            {rooms.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No rooms yet. Add your first room!
              </div>
            ) : (
              <div className="space-y-2">
                {rooms.map((room, index) => (
                  <div
                    key={room.id}
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      hoveredRoomId === room.id || editingRoomId === room.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    onMouseEnter={() => setHoveredRoomId(room.id)}
                    onMouseLeave={() => setHoveredRoomId(null)}
                    onClick={() => openEditModal(room)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-semibold text-gray-900">
                            {room.roomNumber}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{room.name}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(room);
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <PencilIcon className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(room.id);
                          }}
                          className="p-1 hover:bg-red-100 rounded"
                        >
                          <TrashIcon className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Room Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {selectedRoom ? "Edit Room" : "Add Room"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Room Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.roomNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, roomNumber: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 101, A-12"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Room Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Conference Room, Office"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Boundary *
                  </label>
                  
                  {currentPolygon.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-gray-600 mb-3">
                        No polygon drawn yet. Click the button below to start drawing.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowModal(false);
                          startDrawing();
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Draw Polygon on Blueprint
                      </button>
                    </div>
                  ) : (
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-700">
                          <CheckIcon className="w-5 h-5" />
                          <span>Polygon defined ({currentPolygon.length} points)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowModal(false);
                            startDrawing();
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Redraw
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedRoom(null);
                      setEditingRoomId(null);
                      if (!selectedRoom) {
                        setCurrentPolygon([]);
                      }
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={currentPolygon.length < 3}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {selectedRoom ? "Update Room" : "Create Room"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
