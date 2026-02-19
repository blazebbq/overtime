"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  BuildingOfficeIcon,
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import toast, { Toaster } from "react-hot-toast";

type Building = {
  id: string;
  name: string;
  siteCode: string | null;
};

type Floor = {
  id: string;
  name: string;
  buildingId: string;
  blueprintImageUrl: string | null;
  blueprintWidthPx: number | null;
  blueprintHeightPx: number | null;
  building: {
    id: string;
    name: string;
  };
};

export default function FloorsPage() {
  const [floors, setFloors] = useState<Floor[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<Floor | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    buildingId: "",
  });
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [floorsRes, buildingsRes] = await Promise.all([
        fetch("/api/floors"),
        fetch("/api/buildings"),
      ]);

      if (!floorsRes.ok || !buildingsRes.ok) {
        if (floorsRes.status === 401 || buildingsRes.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch data");
      }

      const [floorsData, buildingsData] = await Promise.all([
        floorsRes.json(),
        buildingsRes.json(),
      ]);

      setFloors(floorsData);
      setBuildings(buildingsData);
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = selectedFloor
        ? `/api/floors/${selectedFloor.id}`
        : "/api/floors";
      const method = selectedFloor ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to save floor");
      }

      toast.success(selectedFloor ? "Floor updated!" : "Floor created!");
      setShowModal(false);
      setSelectedFloor(null);
      setFormData({ name: "", buildingId: "" });
      loadData();
    } catch (error) {
      toast.error("Failed to save floor");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this floor? This will also delete all rooms in this floor.")) {
      return;
    }

    try {
      const res = await fetch(`/api/floors/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete floor");
      }

      toast.success("Floor deleted!");
      loadData();
    } catch (error) {
      toast.error("Failed to delete floor");
      console.error(error);
    }
  };

  const handleUploadBlueprint = async (floorId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/floors/${floorId}/blueprint`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to upload blueprint");
      }

      toast.success("Blueprint uploaded!");
      setUploadingFile(null);
      loadData();
    } catch (error) {
      toast.error("Failed to upload blueprint");
      console.error(error);
    }
  };

  const openAddModal = () => {
    setSelectedFloor(null);
    setFormData({ name: "", buildingId: "" });
    setShowModal(true);
  };

  const openEditModal = (floor: Floor) => {
    setSelectedFloor(floor);
    setFormData({
      name: floor.name,
      buildingId: floor.buildingId,
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading floors...</div>
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-right" />
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Floors</h1>
          <p className="text-gray-600 mt-1">Manage building floors and blueprints</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Floor
        </button>
      </div>

      {floors.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BuildingOfficeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No floors found. Create your first floor!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {floors.map((floor) => (
            <div key={floor.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {floor.blueprintImageUrl ? (
                <div className="relative h-48 bg-gray-100">
                  <img
                    src={floor.blueprintImageUrl}
                    alt={`${floor.name} blueprint`}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {floor.blueprintWidthPx} × {floor.blueprintHeightPx}px
                  </div>
                </div>
              ) : (
                <div className="h-48 bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No blueprint</p>
                  </div>
                </div>
              )}

              <div className="p-4">
                <h3 className="font-semibold text-lg text-gray-900">{floor.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{floor.building.name}</p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Blueprint
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadBlueprint(floor.id, file);
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/admin/floors/${floor.id}/rooms`)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <BuildingOfficeIcon className="w-4 h-4" />
                    Rooms
                  </button>
                  <button
                    onClick={() => openEditModal(floor)}
                    className="flex items-center justify-center bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(floor.id)}
                    className="flex items-center justify-center bg-red-100 text-red-700 px-3 py-2 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {selectedFloor ? "Edit Floor" : "Add Floor"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Building
                </label>
                <select
                  required
                  value={formData.buildingId}
                  onChange={(e) =>
                    setFormData({ ...formData, buildingId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Ground Floor, Level 1"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedFloor(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {selectedFloor ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
