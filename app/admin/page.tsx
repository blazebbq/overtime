"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "../components/Header";
import {
  PlusIcon,
  UserGroupIcon,
  ClockIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/solid";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  bookings?: any[];
};

type Overtime = {
  id: string;
  date: string;
  shift: string;
  startTime: string;
  endTime: string;
  requiredPeople: number;
  status: string;
  bookings: Array<{
    user: { name: string; email: string };
  }>;
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overtime" | "users">("overtime");
  const [overtime, setOvertime] = useState<Overtime[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateOvertime, setShowCreateOvertime] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);

  // Check admin access
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN") {
      router.push("/");
      return;
    }

    loadData();
  }, [session, status, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overtimeRes, usersRes] = await Promise.all([
        fetch("/api/admin/overtime"),
        fetch("/api/admin/users"),
      ]);
      const overtimeData = await overtimeRes.json();
      const usersData = await usersRes.json();
      setOvertime(overtimeData);
      setUsers(usersData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "ARCHIVED" ? "OPEN" : "ARCHIVED";
    try {
      await fetch(`/api/admin/overtime/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
    } catch (err) {
      console.error("Failed to update overtime:", err);
    }
  };

  const handleRoleToggle = async (id: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    const confirmed = confirm(
      `Change user role to ${newRole}? This will ${
        newRole === "ADMIN" ? "grant" : "remove"
      } admin access.`
    );
    if (!confirmed) return;

    try {
      await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      loadData();
    } catch (err) {
      console.error("Failed to update user:", err);
    }
  };

  const handleDeleteUser = async (id: string, userName: string) => {
    const confirmed = confirm(
      `Are you sure you want to delete user "${userName}"? This action cannot be undone and will remove all their bookings.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to delete user");
        return;
      }

      loadData();
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert("An error occurred while deleting the user");
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Header />
        <main className="p-4 max-w-6xl mx-auto">
          <div className="text-center text-zinc-400 py-12">Loading...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="p-4 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-zinc-800">
          <button
            onClick={() => setActiveTab("overtime")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === "overtime"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-300"
            }`}
          >
            <ClockIcon className="w-5 h-5 inline mr-2" />
            Overtime Requests
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === "users"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-300"
            }`}
          >
            <UserGroupIcon className="w-5 h-5 inline mr-2" />
            Users
          </button>
        </div>

        {/* Overtime Tab */}
        {activeTab === "overtime" && (
          <div className="space-y-4">
            <button
              onClick={() => setShowCreateOvertime(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Create Overtime Request
            </button>

            {showCreateOvertime && (
              <CreateOvertimeForm
                onClose={() => setShowCreateOvertime(false)}
                onSuccess={() => {
                  setShowCreateOvertime(false);
                  loadData();
                }}
              />
            )}

            <div className="space-y-3">
              {overtime.map((ot) => (
                <div
                  key={ot.id}
                  className={`bg-zinc-900 border border-zinc-800 rounded-lg p-4 ${
                    ot.status === "ARCHIVED" ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-white text-lg">
                          {ot.shift} Shift
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            ot.status === "FULL"
                              ? "bg-green-900 text-green-300"
                              : ot.status === "ARCHIVED"
                              ? "bg-zinc-700 text-zinc-400"
                              : "bg-blue-900 text-blue-300"
                          }`}
                        >
                          {ot.status}
                        </span>
                      </div>
                      <div className="text-sm text-zinc-400 space-y-1">
                        <div>
                          Date: {new Date(ot.date).toLocaleDateString()}
                        </div>
                        <div>
                          Time: {ot.startTime} – {ot.endTime}
                        </div>
                        <div>
                          Bookings: {ot.bookings.length} / {ot.requiredPeople}
                        </div>
                        {ot.bookings.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-semibold text-zinc-500 mb-1">
                              Booked by:
                            </div>
                            {ot.bookings.map((booking, i) => (
                              <div key={i} className="text-xs text-zinc-400">
                                • {booking.user.name} ({booking.user.email})
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleArchiveToggle(ot.id, ot.status)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        ot.status === "ARCHIVED"
                          ? "bg-green-600 hover:bg-green-500 text-white"
                          : "bg-zinc-700 hover:bg-zinc-600 text-white"
                      }`}
                    >
                      <ArchiveBoxIcon className="w-4 h-4" />
                      {ot.status === "ARCHIVED" ? "Unarchive" : "Archive"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <button
              onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Create User
            </button>

            {showCreateUser && (
              <CreateUserForm
                onClose={() => setShowCreateUser(false)}
                onSuccess={() => {
                  setShowCreateUser(false);
                  loadData();
                }}
              />
            )}

            <div className="grid gap-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-white">{user.name}</span>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            user.role === "ADMIN"
                              ? "bg-purple-600 text-white"
                              : "bg-zinc-700 text-zinc-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                      <div className="text-sm text-zinc-400 space-y-1">
                        <div>{user.email}</div>
                        <div>
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                        {user.bookings && (
                          <div>Total bookings: {user.bookings.length}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRoleToggle(user.id, user.role)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-colors ${
                          user.role === "ADMIN"
                            ? "bg-zinc-700 hover:bg-zinc-600 text-white"
                            : "bg-purple-600 hover:bg-purple-500 text-white"
                        }`}
                      >
                        {user.role === "ADMIN" ? "Demote to User" : "Make Admin"}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors"
                        title="Delete User"
                      >
                        <XCircleIcon className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}

// Create Overtime Form Component
function CreateOvertimeForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    date: "",
    shift: "YELLOW",
    startTime: "07:00",
    endTime: "19:00",
    requiredPeople: "2",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const shiftColors = [
    { value: "YELLOW", label: "Yellow", color: "from-yellow-400 to-amber-500", textColor: "text-yellow-900" },
    { value: "ORANGE", label: "Orange", color: "from-orange-400 to-red-500", textColor: "text-orange-900" },
    { value: "PURPLE", label: "Purple", color: "from-purple-400 to-indigo-600", textColor: "text-purple-900" },
    { value: "GREEN", label: "Green", color: "from-green-400 to-emerald-600", textColor: "text-green-900" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create overtime request");
        return;
      }

      onSuccess();
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">
        Create Overtime Request
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              📅 Date
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              👥 Required People
            </label>
            <input
              type="number"
              min="1"
              max="10"
              required
              value={formData.requiredPeople}
              onChange={(e) =>
                setFormData({ ...formData, requiredPeople: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            🎨 Shift Color
          </label>
          <div className="grid grid-cols-2 gap-3">
            {shiftColors.map((shift) => (
              <button
                key={shift.value}
                type="button"
                onClick={() => setFormData({ ...formData, shift: shift.value })}
                className={`px-4 py-3 rounded-xl font-bold transition-all duration-200 bg-gradient-to-br ${shift.color} ${shift.textColor} ${
                  formData.shift === shift.value
                    ? "ring-4 ring-blue-500 scale-105 shadow-xl"
                    : "opacity-70 hover:opacity-100 hover:scale-105"
                }`}
              >
                {shift.label} Shift
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              🕐 Start Time
            </label>
            <input
              type="time"
              required
              value={formData.startTime}
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              🕐 End Time
            </label>
            <input
              type="time"
              required
              value={formData.endTime}
              onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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

// Create User Form Component
function CreateUserForm({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "USER",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create user");
        return;
      }

      onSuccess();
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-white mb-4">Create User</h3>
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
            Email
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Role
          </label>
          <select
            value={formData.role}
            onChange={(e) =>
              setFormData({ ...formData, role: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
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
