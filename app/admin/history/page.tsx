"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { DocumentArrowDownIcon, MagnifyingGlassIcon } from "@heroicons/react/24/solid";

type User = {
  id: string;
  name: string;
  email: string;
};

type HistoryRecord = {
  id: string;
  userName: string;
  userEmail: string;
  area: string;
  shiftColour: string;
  shiftHexColor: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  status: string;
  approvedBy: string | null;
};

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showReportView, setShowReportView] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
    } else if (status === "authenticated") {
      const userRole = (session?.user as { role?: string })?.role;
      if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
        router.push("/");
      } else {
        loadUsers();
      }
    }
  }, [status, session, router]);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Failed to load users");
    }
  };

  const handleSearch = async () => {
    if (selectedUsers.length === 0) {
      setError("Please select at least one user");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      selectedUsers.forEach(userId => params.append("userIds", userId));
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const res = await fetch(`/api/admin/history?${params}`);
      if (!res.ok) throw new Error("Failed to fetch history");
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history:", err);
      setError("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (history.length === 0) {
      setError("No data to export");
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      selectedUsers.forEach(userId => params.append("userIds", userId));
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const res = await fetch(`/api/admin/history/export?${params}`);
      if (!res.ok) throw new Error("Failed to export PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `overtime-history-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      setError("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(users.map(u => u.id));
  };

  const deselectAllUsers = () => {
    setSelectedUsers([]);
  };

  if (status === "loading") {
    return (
      <>
        <Header />
        <main className="p-4 max-w-6xl mx-auto">
          <div className="text-center text-zinc-400">Loading...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="p-4 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Overtime History</h1>
          <p className="text-zinc-400">Search and export overtime history records</p>
        </div>

        {/* Search Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-bold text-white">Search Filters</h2>

          {/* User Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-300">
                Select Users
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllUsers}
                  className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllUsers}
                  className="text-xs px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto bg-zinc-800 rounded-lg p-3 space-y-2">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-zinc-700 p-2 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUser(user.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-white text-sm">
                    {user.name} ({user.email})
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {selectedUsers.length} user(s) selected
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="flex gap-3">
            <button
              onClick={handleSearch}
              disabled={loading || selectedUsers.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
              {loading ? "Searching..." : "Search"}
            </button>
            <button
              onClick={() => setShowReportView(true)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors"
            >
              View Report
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 border-2 border-red-500 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {/* Results */}
        {history.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                Results ({history.length} records)
              </h2>
              <button
                onClick={handleExportPDF}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                <DocumentArrowDownIcon className="w-5 h-5" />
                {exporting ? "Exporting..." : "Export PDF"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-400 uppercase bg-zinc-800">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Area</th>
                    <th className="px-4 py-3">Shift</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Hours</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-zinc-800 hover:bg-zinc-800/50"
                    >
                      <td className="px-4 py-3 text-white">
                        {record.userName}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{record.area}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: record.shiftHexColor }}
                          />
                          <span className="text-zinc-300">{record.shiftColour}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {record.startTime} – {record.endTime} ({record.hours}h)
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            record.status === "APPROVED"
                              ? "bg-green-600 text-white"
                              : "bg-yellow-600 text-white"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {record.approvedBy || "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Report View Modal */}
      {showReportView && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 rounded-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto border-2 border-zinc-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Overtime History Report
              </h2>
              <button
                onClick={() => setShowReportView(false)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-zinc-400 text-lg">
                  No overtime records found for selected criteria
                </p>
                <p className="text-zinc-500 text-sm mt-2">
                  Please adjust your search filters and try again
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-4 p-4 bg-zinc-700 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-zinc-400">Total Records:</span>
                      <span className="ml-2 text-white font-bold">{history.length}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Export Date:</span>
                      <span className="ml-2 text-white font-bold">
                        {new Date().toLocaleDateString()}
                      </span>
                    </div>
                    {dateFrom && (
                      <div>
                        <span className="text-zinc-400">From:</span>
                        <span className="ml-2 text-white font-bold">
                          {new Date(dateFrom).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {dateTo && (
                      <div>
                        <span className="text-zinc-400">To:</span>
                        <span className="ml-2 text-white font-bold">
                          {new Date(dateTo).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-400 uppercase bg-zinc-700">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Area</th>
                        <th className="px-4 py-3">Shift</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Hours</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Approved By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((record) => (
                        <tr
                          key={record.id}
                          className="border-b border-zinc-700 hover:bg-zinc-700/50"
                        >
                          <td className="px-4 py-3 text-white">
                            {record.userName}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">{record.area}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: record.shiftHexColor }}
                              />
                              <span className="text-zinc-300">{record.shiftColour}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-300">
                            {new Date(record.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-zinc-300">
                            {record.startTime} – {record.endTime} ({record.hours}h)
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-bold ${
                                record.status === "APPROVED"
                                  ? "bg-green-600 text-white"
                                  : "bg-yellow-600 text-white"
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-300">
                            {record.approvedBy || "–"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
