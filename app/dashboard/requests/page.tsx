"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";

type Application = {
  id: string;
  requestType: string;
  requestedStartTime: string | null;
  requestedEndTime: string | null;
  comment: string | null;
  status: string;
  approvedStartTime: string | null;
  approvedEndTime: string | null;
  rejectionReason: string | null;
  createdAt: string;
  assignedManager?: {
    id: string;
    name: string;
  } | null;
  overtime: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    area: {
      name: string;
    };
    shiftColour: {
      name: string;
      hexColor: string;
    };
  };
};

function getStatusBadge(status: string) {
  const badges: Record<string, { label: string; className: string }> = {
    PENDING_APPROVAL: {
      label: "⏳ Pending Approval",
      className: "bg-yellow-500 text-white",
    },
    APPROVED: {
      label: "✓ Approved",
      className: "bg-green-600 text-white",
    },
    REJECTED_MANUAL: {
      label: "✗ Rejected",
      className: "bg-red-600 text-white",
    },
    REJECTED_CAPACITY: {
      label: "⚠ Capacity Full",
      className: "bg-orange-600 text-white",
    },
    CANCEL_PENDING: {
      label: "🔄 Cancellation Pending",
      className: "bg-orange-500 text-white",
    },
    CANCELLED: {
      label: "❌ Cancelled",
      className: "bg-gray-600 text-white",
    },
  };

  const badge = badges[status] || { label: status, className: "bg-gray-500 text-white" };
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge.className}`}>
      {badge.label}
    </span>
  );
}

export default function MyRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadRequests();
    }
  }, [status]);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/applications/my-requests");
      if (!res.ok) throw new Error("Failed to fetch requests");
      const data = await res.json();
      setApplications(data);
    } catch (err) {
      console.error("Failed to load requests:", err);
      setError("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPending = async (applicationId: string) => {
    if (!confirm("Are you sure you want to cancel this application?")) {
      return;
    }

    setCancellingId(applicationId);
    try {
      const res = await fetch("/api/applications/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel application");
      }

      await loadRequests();
      alert("Application cancelled successfully");
    } catch (err) {
      console.error("Failed to cancel application:", err);
      alert(err instanceof Error ? err.message : "Failed to cancel application");
    } finally {
      setCancellingId(null);
    }
  };

  const handleRequestCancellation = (applicationId: string) => {
    setSelectedAppId(applicationId);
    setCancellationReason("");
    setShowCancelModal(true);
  };

  const handleSubmitCancellation = async () => {
    if (!selectedAppId || !cancellationReason.trim()) {
      alert("Please provide a reason for cancellation");
      return;
    }

    setCancellingId(selectedAppId);
    try {
      const res = await fetch("/api/applications/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedAppId,
          cancellationReason: cancellationReason.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to request cancellation");
      }

      await loadRequests();
      setShowCancelModal(false);
      setSelectedAppId(null);
      setCancellationReason("");
      alert("Cancellation request submitted successfully");
    } catch (err) {
      console.error("Failed to request cancellation:", err);
      alert(err instanceof Error ? err.message : "Failed to request cancellation");
    } finally {
      setCancellingId(null);
    }
  };

  if (status === "loading" || status === "loading") return;
    
    if (!session) {
    return (
      <>
        <Header />
        <main className="p-4 max-w-4xl mx-auto">
          <div className="text-center text-zinc-400">Loading...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="p-4 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">My Requests</h1>
            <p className="text-zinc-400">Track all your overtime applications</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 border-2 border-red-500 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-center text-zinc-400">Loading...</div>
        )}

        {!loading && applications.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-zinc-400 text-lg mb-4">
              No applications yet
            </p>
            <Link
              href="/dashboard/available"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Apply for Overtime
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {applications.map((app) => {
            const isPending = app.status === "PENDING_APPROVAL";
            const isApproved = app.status === "APPROVED";
            const isRejected = app.status.startsWith("REJECTED");
            const isCancelPending = app.status === "CANCEL_PENDING";
            const isCancelled = app.status === "CANCELLED";
            const canReapply = isRejected || isCancelled;

            return (
              <div
                key={app.id}
                className={`p-6 rounded-xl border-2 ${
                  isPending
                    ? "bg-zinc-800 border-yellow-500/50"
                    : isApproved
                    ? "bg-green-900/20 border-green-500/50"
                    : isCancelPending
                    ? "bg-orange-900/20 border-orange-500/50"
                    : isCancelled
                    ? "bg-gray-900/20 border-gray-500/50"
                    : "bg-red-900/20 border-red-500/50"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: app.overtime.shiftColour.hexColor }}
                    />
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {app.overtime.shiftColour.name} Shift - {app.overtime.area.name}
                      </h3>
                      <p className="text-sm text-zinc-400">
                        Applied {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                      {isPending && app.assignedManager && (
                        <p className="text-sm text-yellow-400 font-semibold mt-1">
                          Waiting with: {app.assignedManager.name}
                        </p>
                      )}
                      {isCancelPending && app.assignedManager && (
                        <p className="text-sm text-orange-400 font-semibold mt-1">
                          Waiting with: {app.assignedManager.name}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(app.status)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="text-sm text-zinc-300">
                    <strong className="text-white">Date:</strong>{" "}
                    {new Date(app.overtime.date).toDateString()}
                  </div>
                  <div className="text-sm text-zinc-300">
                    <strong className="text-white">Request Type:</strong>{" "}
                    {app.requestType === "FULL" ? "Full Shift" : "Partial Availability"}
                  </div>
                  {app.requestType === "FULL" ? (
                    <div className="text-sm text-zinc-300">
                      <strong className="text-white">Shift Hours:</strong>{" "}
                      {app.overtime.startTime} – {app.overtime.endTime}
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-300">
                      <strong className="text-white">Requested Hours:</strong>{" "}
                      {app.requestedStartTime} – {app.requestedEndTime}
                    </div>
                  )}
                </div>

                {app.comment && (
                  <div className="mb-4 p-3 bg-zinc-700/50 rounded-lg">
                    <strong className="text-white text-sm">Your Comment:</strong>
                    <p className="text-zinc-300 text-sm mt-1">{app.comment}</p>
                  </div>
                )}

                {isApproved && app.approvedStartTime && app.approvedEndTime && (
                  <div className="p-3 bg-green-900/30 rounded-lg border border-green-500/50 mb-4">
                    <strong className="text-green-300 text-sm">Approved Hours:</strong>
                    <p className="text-green-200 text-sm mt-1">
                      {app.approvedStartTime} – {app.approvedEndTime}
                    </p>
                  </div>
                )}

                {isRejected && app.rejectionReason && (
                  <div className="p-3 bg-red-900/30 rounded-lg border border-red-500/50 mb-4">
                    <strong className="text-red-300 text-sm">Rejection Reason:</strong>
                    <p className="text-red-200 text-sm mt-1">{app.rejectionReason}</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-3 mt-4">
                  {isPending && (
                    <button
                      onClick={() => handleCancelPending(app.id)}
                      disabled={cancellingId === app.id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                    >
                      {cancellingId === app.id ? "Cancelling..." : "Cancel Request"}
                    </button>
                  )}

                  {isApproved && (
                    <button
                      onClick={() => handleRequestCancellation(app.id)}
                      disabled={cancellingId === app.id}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                    >
                      Request Cancellation
                    </button>
                  )}

                  {canReapply && (
                    <Link
                      href="/dashboard/available"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Apply Again
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cancellation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-800 rounded-xl p-6 max-w-md w-full border-2 border-orange-500">
              <h2 className="text-2xl font-bold text-white mb-4">Request Cancellation</h2>
              <p className="text-zinc-300 mb-4">
                Please provide a reason for requesting cancellation. This will be sent to your manager for approval.
              </p>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full p-3 bg-zinc-700 text-white rounded-lg border-2 border-zinc-600 focus:border-orange-500 focus:outline-none mb-4"
                rows={4}
                placeholder="Enter your reason for cancellation..."
              />
              <div className="flex gap-3">
                <button
                  onClick={handleSubmitCancellation}
                  disabled={!cancellationReason.trim() || cancellingId !== null}
                  className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-800 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                >
                  {cancellingId ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedAppId(null);
                    setCancellationReason("");
                  }}
                  disabled={cancellingId !== null}
                  className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:bg-zinc-800 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
