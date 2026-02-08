"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@/app/components/Header";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  Cog6ToothIcon,
  SwatchIcon,
  CalendarIcon,
  UserGroupIcon,
} from "@heroicons/react/24/solid";

type Area = {
  id: string;
  name: string;
  enabled: boolean;
  shiftColours: Array<{
    shiftColour: {
      id: string;
      name: string;
      hexColor: string;
    };
  }>;
  _count: {
    overtimeRequests: number;
  };
};

type ShiftColour = {
  id: string;
  name: string;
  hexColor: string;
  enabled: boolean;
  areas: Array<{
    area: {
      id: string;
      name: string;
    };
  }>;
  _count: {
    overtimeRequests: number;
  };
};

type ShiftPattern = {
  id: string;
  name: string;
  cycleLength: number;
  patternData: string;
  _count: {
    userAssignments: number;
  };
};

type ManagerAssignment = {
  id: string;
  manager: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
  area: {
    id: string;
    name: string;
  } | null;
  shiftColour: {
    id: string;
    name: string;
  } | null;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type TabType = "areas" | "shift-colours" | "shift-patterns" | "manager-assignments";

export default function ConfigPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("areas");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }

    const userRole = (session.user as { role: string }).role;
    if (userRole !== "SUPER_ADMIN") {
      router.push("/");
      return;
    }

    setLoading(false);
  }, [session, status, router]);

  if (status === "loading" || loading) {
    return (
      <>
        <Header />
        <main className="p-4 max-w-7xl mx-auto">
          <div className="text-center text-zinc-400 py-12">Loading...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="p-4 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Configuration</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-zinc-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab("areas")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "areas"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-300"
            }`}
          >
            <Cog6ToothIcon className="w-5 h-5 inline mr-2" />
            Areas
          </button>
          <button
            onClick={() => setActiveTab("shift-colours")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "shift-colours"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-300"
            }`}
          >
            <SwatchIcon className="w-5 h-5 inline mr-2" />
            Shift Colours
          </button>
          <button
            onClick={() => setActiveTab("shift-patterns")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "shift-patterns"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-300"
            }`}
          >
            <CalendarIcon className="w-5 h-5 inline mr-2" />
            Shift Patterns
          </button>
          <button
            onClick={() => setActiveTab("manager-assignments")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
              activeTab === "manager-assignments"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-300"
            }`}
          >
            <UserGroupIcon className="w-5 h-5 inline mr-2" />
            Manager Assignments
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "areas" && <AreasTab />}
        {activeTab === "shift-colours" && <ShiftColoursTab />}
        {activeTab === "shift-patterns" && <ShiftPatternsTab />}
        {activeTab === "manager-assignments" && <ManagerAssignmentsTab />}
      </main>
    </>
  );
}

// Areas Tab Component
function AreasTab() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [notification, setNotification] = useState<string>("");

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/areas");
      const data = await res.json();
      setAreas(data);
    } catch (err) {
      console.error("Failed to load areas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/admin/areas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      showNotification(`Area ${!enabled ? "enabled" : "disabled"} successfully`);
      loadAreas();
    } catch (err) {
      console.error("Failed to toggle area:", err);
    }
  };

  const handleStartEdit = (area: Area) => {
    setEditingId(area.id);
    setEditName(area.name);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await fetch(`/api/admin/areas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      showNotification("Area updated successfully");
      setEditingId(null);
      loadAreas();
    } catch (err) {
      console.error("Failed to update area:", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete area "${name}"?`)) return;
    
    try {
      const res = await fetch(`/api/admin/areas/${id}`, {
        method: "DELETE",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Failed to delete area");
        return;
      }
      
      showNotification("Area deleted successfully");
      loadAreas();
    } catch (err) {
      console.error("Failed to delete area:", err);
      alert("An error occurred while deleting the area");
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 3000);
  };

  if (loading) {
    return <div className="text-center text-zinc-400 py-12">Loading areas...</div>;
  }

  return (
    <div className="space-y-4">
      {notification && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg">
          {notification}
        </div>
      )}

      <button
        onClick={() => setShowCreate(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        Create Area
      </button>

      {showCreate && (
        <CreateAreaForm
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            showNotification("Area created successfully");
            loadAreas();
          }}
        />
      )}

      <div className="space-y-3">
        {areas.map((area) => (
          <div
            key={area.id}
            className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${
              !area.enabled ? "opacity-60" : ""
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                {editingId === area.id ? (
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleSaveEdit(area.id)}
                      className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-white text-lg">{area.name}</span>
                    {!area.enabled && (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-zinc-700 text-zinc-400">
                        DISABLED
                      </span>
                    )}
                  </div>
                )}
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>Overtime Requests: {area._count.overtimeRequests}</div>
                  {area.shiftColours.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-zinc-500 mb-1">
                        Shift Colours:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {area.shiftColours.map((sc) => (
                          <div
                            key={sc.shiftColour.id}
                            className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-800"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: sc.shiftColour.hexColor }}
                            />
                            <span className="text-xs">{sc.shiftColour.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {editingId !== area.id && (
                  <>
                    <button
                      onClick={() => handleStartEdit(area)}
                      className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-sm transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleEnabled(area.id, area.enabled)}
                      className={`px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        area.enabled
                          ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                          : "bg-green-600 hover:bg-green-500 text-white"
                      }`}
                    >
                      {area.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => handleDelete(area.id, area.name)}
                      className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateAreaForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    enabled: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create area");
        return;
      }

      onSuccess();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Create Area</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData({ ...formData, enabled: e.target.checked })
            }
            className="w-4 h-4 rounded bg-zinc-800 border-zinc-700"
          />
          <label htmlFor="enabled" className="text-sm text-zinc-300">
            Enabled
          </label>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
          >
            {loading ? "Creating..." : "Create"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-white bg-zinc-700 hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// Shift Colours Tab Component
function ShiftColoursTab() {
  const [shiftColours, setShiftColours] = useState<ShiftColour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", hexColor: "", enabled: true });
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string>("");

  useEffect(() => {
    loadShiftColours();
  }, []);

  const loadShiftColours = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shift-colours");
      const data = await res.json();
      setShiftColours(data);
    } catch (err) {
      console.error("Failed to load shift colours:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/admin/shift-colours/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      showNotification(`Shift colour ${!enabled ? "enabled" : "disabled"} successfully`);
      loadShiftColours();
    } catch (err) {
      console.error("Failed to toggle shift colour:", err);
    }
  };

  const handleStartEdit = (sc: ShiftColour) => {
    setEditingId(sc.id);
    setEditData({ name: sc.name, hexColor: sc.hexColor, enabled: sc.enabled });
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await fetch(`/api/admin/shift-colours/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      showNotification("Shift colour updated successfully");
      setEditingId(null);
      loadShiftColours();
    } catch (err) {
      console.error("Failed to update shift colour:", err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete shift colour "${name}"?`)) return;
    
    try {
      const res = await fetch(`/api/admin/shift-colours/${id}`, {
        method: "DELETE",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Failed to delete shift colour");
        return;
      }
      
      showNotification("Shift colour deleted successfully");
      loadShiftColours();
    } catch (err) {
      console.error("Failed to delete shift colour:", err);
      alert("An error occurred while deleting the shift colour");
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 3000);
  };

  if (loading) {
    return <div className="text-center text-zinc-400 py-12">Loading shift colours...</div>;
  }

  return (
    <div className="space-y-4">
      {notification && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg">
          {notification}
        </div>
      )}

      <button
        onClick={() => setShowCreate(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        Create Shift Colour
      </button>

      {showCreate && (
        <CreateShiftColourForm
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            showNotification("Shift colour created successfully");
            loadShiftColours();
          }}
        />
      )}

      {assigningId && (
        <AssignAreasForm
          shiftColourId={assigningId}
          currentAreas={shiftColours.find(sc => sc.id === assigningId)?.areas.map(a => a.area.id) || []}
          onClose={() => setAssigningId(null)}
          onSuccess={() => {
            setAssigningId(null);
            showNotification("Areas assigned successfully");
            loadShiftColours();
          }}
        />
      )}

      <div className="space-y-3">
        {shiftColours.map((sc) => (
          <div
            key={sc.id}
            className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${
              !sc.enabled ? "opacity-60" : ""
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                {editingId === sc.id ? (
                  <div className="space-y-3 mb-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Name"
                      />
                      <input
                        type="color"
                        value={editData.hexColor}
                        onChange={(e) => setEditData({ ...editData, hexColor: e.target.value })}
                        className="w-16 h-10 rounded-lg bg-zinc-800 border border-zinc-700 cursor-pointer"
                      />
                      <button
                        onClick={() => handleSaveEdit(sc.id)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors"
                      >
                        <CheckIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="w-8 h-8 rounded-lg shadow-md"
                      style={{ backgroundColor: sc.hexColor }}
                      title={sc.hexColor}
                    />
                    <span className="font-bold text-white text-lg">{sc.name}</span>
                    <span className="text-xs text-zinc-500">{sc.hexColor}</span>
                    {!sc.enabled && (
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-zinc-700 text-zinc-400">
                        DISABLED
                      </span>
                    )}
                  </div>
                )}
                <div className="text-sm text-zinc-400 space-y-1">
                  <div>Overtime Requests: {sc._count.overtimeRequests}</div>
                  {sc.areas.length > 0 ? (
                    <div className="mt-2">
                      <div className="text-xs font-semibold text-zinc-500 mb-1">
                        Assigned to Areas:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sc.areas.map((a) => (
                          <span
                            key={a.area.id}
                            className="px-2 py-1 rounded bg-zinc-800 text-xs"
                          >
                            {a.area.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 mt-2">Not assigned to any areas</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {editingId !== sc.id && (
                  <>
                    <button
                      onClick={() => setAssigningId(sc.id)}
                      className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors whitespace-nowrap"
                    >
                      Assign Areas
                    </button>
                    <button
                      onClick={() => handleStartEdit(sc)}
                      className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-sm transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleEnabled(sc.id, sc.enabled)}
                      className={`px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        sc.enabled
                          ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                          : "bg-green-600 hover:bg-green-500 text-white"
                      }`}
                    >
                      {sc.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => handleDelete(sc.id, sc.name)}
                      className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreateShiftColourForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    hexColor: "#3B82F6",
    enabled: true,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/shift-colours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create shift colour");
        return;
      }

      onSuccess();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Create Shift Colour</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Colour
          </label>
          <div className="flex gap-3">
            <input
              type="color"
              value={formData.hexColor}
              onChange={(e) =>
                setFormData({ ...formData, hexColor: e.target.value })
              }
              className="w-20 h-10 rounded-lg bg-zinc-800 border border-zinc-700 cursor-pointer"
            />
            <input
              type="text"
              value={formData.hexColor}
              onChange={(e) =>
                setFormData({ ...formData, hexColor: e.target.value })
              }
              placeholder="#3B82F6"
              pattern="^#[0-9A-Fa-f]{6}$"
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData({ ...formData, enabled: e.target.checked })
            }
            className="w-4 h-4 rounded bg-zinc-800 border-zinc-700"
          />
          <label htmlFor="enabled" className="text-sm text-zinc-300">
            Enabled
          </label>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
          >
            {loading ? "Creating..." : "Create"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-white bg-zinc-700 hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function AssignAreasForm({
  shiftColourId,
  currentAreas,
  onClose,
  onSuccess,
}: {
  shiftColourId: string;
  currentAreas: string[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(currentAreas);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAreas();
  }, []);

  const loadAreas = async () => {
    try {
      const res = await fetch("/api/admin/areas");
      const data = await res.json();
      setAreas(data.filter((a: Area) => a.enabled));
    } catch (err) {
      console.error("Failed to load areas:", err);
      setError("Failed to load areas");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArea = (areaId: string) => {
    if (selectedAreas.includes(areaId)) {
      setSelectedAreas(selectedAreas.filter(id => id !== areaId));
    } else {
      setSelectedAreas([...selectedAreas, areaId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAreas.length === 0) {
      setError("Please select at least one area");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/shift-colours/${shiftColourId}/areas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ areaIds: selectedAreas }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to assign areas");
        return;
      }

      onSuccess();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="text-center text-zinc-400 py-8">Loading areas...</div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Assign to Areas</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Select Areas
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {areas.map((area) => (
              <label
                key={area.id}
                className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedAreas.includes(area.id)
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedAreas.includes(area.id)}
                  onChange={() => handleToggleArea(area.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm">{area.name}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
          >
            {submitting ? "Assigning..." : "Assign"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-white bg-zinc-700 hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// Shift Patterns Tab Component
function ShiftPatternsTab() {
  const [shiftPatterns, setShiftPatterns] = useState<ShiftPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string>("");

  useEffect(() => {
    loadShiftPatterns();
  }, []);

  const loadShiftPatterns = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shift-patterns");
      const data = await res.json();
      setShiftPatterns(data);
    } catch (err) {
      console.error("Failed to load shift patterns:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete shift pattern "${name}"?`)) return;
    
    try {
      const res = await fetch(`/api/admin/shift-patterns/${id}`, {
        method: "DELETE",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Failed to delete shift pattern");
        return;
      }
      
      showNotification("Shift pattern deleted successfully");
      loadShiftPatterns();
    } catch (err) {
      console.error("Failed to delete shift pattern:", err);
      alert("An error occurred while deleting the shift pattern");
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 3000);
  };

  if (loading) {
    return <div className="text-center text-zinc-400 py-12">Loading shift patterns...</div>;
  }

  return (
    <div className="space-y-4">
      {notification && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg">
          {notification}
        </div>
      )}

      <button
        onClick={() => setShowCreate(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        Create Shift Pattern
      </button>

      {showCreate && (
        <CreateShiftPatternForm
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            showNotification("Shift pattern created successfully");
            loadShiftPatterns();
          }}
        />
      )}

      {editingId && (
        <EditShiftPatternForm
          patternId={editingId}
          pattern={shiftPatterns.find(p => p.id === editingId)!}
          onClose={() => setEditingId(null)}
          onSuccess={() => {
            setEditingId(null);
            showNotification("Shift pattern updated successfully");
            loadShiftPatterns();
          }}
        />
      )}

      {assigningId && (
        <AssignUsersToPatternForm
          patternId={assigningId}
          onClose={() => setAssigningId(null)}
          onSuccess={() => {
            setAssigningId(null);
            showNotification("Users assigned successfully");
            loadShiftPatterns();
          }}
        />
      )}

      <div className="space-y-3">
        {shiftPatterns.map((pattern) => {
          const patternData = JSON.parse(pattern.patternData);
          const workDays = patternData.days.filter((d: boolean) => d).length;
          
          return (
            <div
              key={pattern.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-white text-lg">{pattern.name}</span>
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-600 text-white">
                      {pattern.cycleLength} days
                    </span>
                  </div>
                  <div className="text-sm text-zinc-400 space-y-2">
                    <div>Work days: {workDays} / {pattern.cycleLength}</div>
                    <div>Users assigned: {pattern._count.userAssignments}</div>
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-zinc-500 mb-2">
                        Pattern:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {patternData.days.map((isWork: boolean, idx: number) => (
                          <div
                            key={idx}
                            className={`w-8 h-8 flex items-center justify-center rounded text-xs font-semibold ${
                              isWork
                                ? "bg-green-600 text-white"
                                : "bg-zinc-800 text-zinc-500"
                            }`}
                            title={`Day ${idx + 1}: ${isWork ? "Work" : "Off"}`}
                          >
                            {idx + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAssigningId(pattern.id)}
                    className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors whitespace-nowrap"
                  >
                    Assign Users
                  </button>
                  <button
                    onClick={() => setEditingId(pattern.id)}
                    className="px-3 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-sm transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(pattern.id, pattern.name)}
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateShiftPatternForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    cycleLength: 7,
  });
  const [patternDays, setPatternDays] = useState<boolean[]>(Array(7).fill(false));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCycleLengthChange = (newLength: number) => {
    const length = Math.max(1, Math.min(365, newLength));
    setFormData({ ...formData, cycleLength: length });
    
    if (length > patternDays.length) {
      setPatternDays([...patternDays, ...Array(length - patternDays.length).fill(false)]);
    } else if (length < patternDays.length) {
      setPatternDays(patternDays.slice(0, length));
    }
  };

  const toggleDay = (index: number) => {
    const newDays = [...patternDays];
    newDays[index] = !newDays[index];
    setPatternDays(newDays);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/shift-patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          patternData: JSON.stringify({ days: patternDays }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create shift pattern");
        return;
      }

      onSuccess();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Create Shift Pattern</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Cycle Length (days)
          </label>
          <input
            type="number"
            required
            min="1"
            max="365"
            value={formData.cycleLength}
            onChange={(e) => handleCycleLengthChange(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Pattern (click to toggle work days)
          </label>
          <div className="flex flex-wrap gap-2 p-4 bg-zinc-800 rounded-lg max-h-96 overflow-y-auto">
            {patternDays.map((isWork, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleDay(idx)}
                className={`w-10 h-10 flex items-center justify-center rounded font-semibold transition-colors ${
                  isWork
                    ? "bg-green-600 hover:bg-green-500 text-white"
                    : "bg-zinc-700 hover:bg-zinc-600 text-zinc-400"
                }`}
                title={`Day ${idx + 1}: Click to toggle`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <div className="text-xs text-zinc-400 mt-2">
            Work days: {patternDays.filter(d => d).length} / {patternDays.length}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
          >
            {loading ? "Creating..." : "Create"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-white bg-zinc-700 hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function EditShiftPatternForm({
  patternId,
  pattern,
  onClose,
  onSuccess,
}: {
  patternId: string;
  pattern: ShiftPattern;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const initialData = JSON.parse(pattern.patternData);
  const [formData, setFormData] = useState({
    name: pattern.name,
    cycleLength: pattern.cycleLength,
  });
  const [patternDays, setPatternDays] = useState<boolean[]>(initialData.days);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCycleLengthChange = (newLength: number) => {
    const length = Math.max(1, Math.min(365, newLength));
    setFormData({ ...formData, cycleLength: length });
    
    if (length > patternDays.length) {
      setPatternDays([...patternDays, ...Array(length - patternDays.length).fill(false)]);
    } else if (length < patternDays.length) {
      setPatternDays(patternDays.slice(0, length));
    }
  };

  const toggleDay = (index: number) => {
    const newDays = [...patternDays];
    newDays[index] = !newDays[index];
    setPatternDays(newDays);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/shift-patterns/${patternId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          patternData: JSON.stringify({ days: patternDays }),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update shift pattern");
        return;
      }

      onSuccess();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Edit Shift Pattern</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Cycle Length (days)
          </label>
          <input
            type="number"
            required
            min="1"
            max="365"
            value={formData.cycleLength}
            onChange={(e) => handleCycleLengthChange(parseInt(e.target.value) || 1)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Pattern (click to toggle work days)
          </label>
          <div className="flex flex-wrap gap-2 p-4 bg-zinc-800 rounded-lg max-h-96 overflow-y-auto">
            {patternDays.map((isWork, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleDay(idx)}
                className={`w-10 h-10 flex items-center justify-center rounded font-semibold transition-colors ${
                  isWork
                    ? "bg-green-600 hover:bg-green-500 text-white"
                    : "bg-zinc-700 hover:bg-zinc-600 text-zinc-400"
                }`}
                title={`Day ${idx + 1}: Click to toggle`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <div className="text-xs text-zinc-400 mt-2">
            Work days: {patternDays.filter(d => d).length} / {patternDays.length}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
          >
            {loading ? "Updating..." : "Update"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-white bg-zinc-700 hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function AssignUsersToPatternForm({
  patternId,
  onClose,
  onSuccess,
}: {
  patternId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      setError("Please select at least one user");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/shift-patterns/${patternId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userIds: selectedUsers,
          startDate: new Date(startDate).toISOString()
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to assign users");
        return;
      }

      onSuccess();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="text-center text-zinc-400 py-8">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Assign Users to Pattern</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Start Date
          </label>
          <input
            type="date"
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Select Users
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {users.map((user) => (
              <label
                key={user.id}
                className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedUsers.includes(user.id)
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleToggleUser(user.id)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold">{user.name}</div>
                  <div className="text-xs opacity-75">{user.email}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
          >
            {submitting ? "Assigning..." : "Assign"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-white bg-zinc-700 hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// Manager Assignments Tab Component
function ManagerAssignmentsTab() {
  const [assignments, setAssignments] = useState<ManagerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [notification, setNotification] = useState<string>("");

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/manager-assignments");
      const data = await res.json();
      setAssignments(data);
    } catch (err) {
      console.error("Failed to load manager assignments:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, managerName: string, userName: string) => {
    if (!confirm(`Remove assignment: ${managerName} → ${userName}?`)) return;
    
    try {
      const res = await fetch(`/api/admin/manager-assignments/${id}`, {
        method: "DELETE",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        alert(data.error || "Failed to delete assignment");
        return;
      }
      
      showNotification("Assignment deleted successfully");
      loadAssignments();
    } catch (err) {
      console.error("Failed to delete assignment:", err);
      alert("An error occurred while deleting the assignment");
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(""), 3000);
  };

  if (loading) {
    return <div className="text-center text-zinc-400 py-12">Loading manager assignments...</div>;
  }

  // Group assignments by manager
  const groupedAssignments = assignments.reduce((acc, assignment) => {
    const managerId = assignment.manager.id;
    if (!acc[managerId]) {
      acc[managerId] = {
        manager: assignment.manager,
        assignments: [],
      };
    }
    acc[managerId].assignments.push(assignment);
    return acc;
  }, {} as Record<string, { manager: ManagerAssignment['manager']; assignments: ManagerAssignment[] }>);

  return (
    <div className="space-y-4">
      {notification && (
        <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg">
          {notification}
        </div>
      )}

      <button
        onClick={() => setShowCreate(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
      >
        <PlusIcon className="w-5 h-5" />
        Create Assignment
      </button>

      {showCreate && (
        <CreateManagerAssignmentForm
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            showNotification("Assignment created successfully");
            loadAssignments();
          }}
        />
      )}

      <div className="space-y-4">
        {Object.values(groupedAssignments).map(({ manager, assignments }) => (
          <div
            key={manager.id}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
          >
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-zinc-800">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-lg">{manager.name}</span>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      manager.role === "SUPER_ADMIN"
                        ? "bg-red-600 text-white"
                        : manager.role === "ADMIN"
                        ? "bg-purple-600 text-white"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {manager.role}
                  </span>
                </div>
                <div className="text-sm text-zinc-400">{manager.email}</div>
              </div>
              <div className="text-sm text-zinc-400">
                {assignments.length} assignment{assignments.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="space-y-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex justify-between items-center p-3 bg-zinc-800 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {assignment.user.name}
                      </span>
                      <span className="text-xs text-zinc-500">
                        ({assignment.user.email})
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-zinc-400">
                      {assignment.area && (
                        <span className="px-2 py-1 rounded bg-zinc-700">
                          📍 {assignment.area.name}
                        </span>
                      )}
                      {assignment.shiftColour && (
                        <span className="px-2 py-1 rounded bg-zinc-700">
                          🎨 {assignment.shiftColour.name}
                        </span>
                      )}
                      {!assignment.area && !assignment.shiftColour && (
                        <span className="text-zinc-500">All areas & colours</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(assignment.id, manager.name, assignment.user.name)}
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {assignments.length === 0 && (
          <div className="text-center text-zinc-400 py-12">
            No manager assignments yet. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}

function CreateManagerAssignmentForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    managerId: "",
    userId: "",
    areaId: "",
    shiftColourId: "",
  });
  const [users, setUsers] = useState<User[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [shiftColours, setShiftColours] = useState<ShiftColour[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, areasRes, shiftColoursRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/areas"),
        fetch("/api/admin/shift-colours"),
      ]);

      const usersData = await usersRes.json();
      const areasData = await areasRes.json();
      const shiftColoursData = await shiftColoursRes.json();

      setUsers(usersData);
      setAreas(areasData.filter((a: Area) => a.enabled));
      setShiftColours(shiftColoursData.filter((sc: ShiftColour) => sc.enabled));
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const managers = users.filter(u => 
    ["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(u.role)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.managerId || !formData.userId) {
      setError("Manager and User are required");
      return;
    }

    if (formData.managerId === formData.userId) {
      setError("Manager cannot be assigned to themselves");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const body: any = {
        managerId: formData.managerId,
        userId: formData.userId,
      };
      
      if (formData.areaId) body.areaId = formData.areaId;
      if (formData.shiftColourId) body.shiftColourId = formData.shiftColourId;

      const res = await fetch("/api/admin/manager-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create assignment");
        return;
      }

      onSuccess();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
        <div className="text-center text-zinc-400 py-8">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Create Manager Assignment</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Manager *
          </label>
          <select
            required
            value={formData.managerId}
            onChange={(e) =>
              setFormData({ ...formData, managerId: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a manager</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name} ({manager.role}) - {manager.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            User *
          </label>
          <select
            required
            value={formData.userId}
            onChange={(e) =>
              setFormData({ ...formData, userId: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} - {user.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Area (optional)
          </label>
          <select
            value={formData.areaId}
            onChange={(e) =>
              setFormData({ ...formData, areaId: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All areas</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Shift Colour (optional)
          </label>
          <select
            value={formData.shiftColourId}
            onChange={(e) =>
              setFormData({ ...formData, shiftColourId: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All shift colours</option>
            {shiftColours.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2 px-4 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 transition-colors"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-semibold text-white bg-zinc-700 hover:bg-zinc-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
