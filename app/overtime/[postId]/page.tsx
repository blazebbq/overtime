"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import Header from "../../components/Header";

type Application = {
  id: string;
  userId: string;
  status: string;
  requestType: string;
  requestedStartTime: string | null;
  requestedEndTime: string | null;
  approvedStartTime: string | null;
  approvedEndTime: string | null;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type AcceptedWorker = {
  id: string;
  user: {
    id: string;
    name: string;
  };
  approvedStartTime: string | null;
  approvedEndTime: string | null;
  requestType: string;
};

type OvertimePost = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredPeople: number;
  approvedCount: number;
  areaId: string;
  shiftColourId: string;
  area: {
    id: string;
    name: string;
  };
  shiftColour: {
    id: string;
    name: string;
    hexColor: string;
  };
  acceptedWorkers: AcceptedWorker[];
  allApplications?: Application[];
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTextColor(hexColor: string): string {
  if (!hexColor || !/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
    return "text-white";
  }
  
  const luminance = parseInt(hexColor.slice(1, 3), 16) * 0.299 +
                   parseInt(hexColor.slice(3, 5), 16) * 0.587 +
                   parseInt(hexColor.slice(5, 7), 16) * 0.114;
  return luminance < 128 ? "text-white" : "text-gray-900";
}

export default function OvertimePostDetails() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  
  const [post, setPost] = useState<OvertimePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removeApplicationId, setRemoveApplicationId] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState("");

  const userRole = (session?.user as { role?: string })?.role || "USER";
  const isManagerOrAdmin = ["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(userRole);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && postId) {
      loadPostDetails();
    }
  }, [status, postId]);

  const loadPostDetails = async () => {
    try {
      const res = await fetch(`/api/overtime/${postId}/details?includeApplications=${isManagerOrAdmin}`);
      if (!res.ok) throw new Error("Failed to fetch post details");
      const data = await res.json();
      setPost(data);
    } catch (err) {
      console.error("Failed to load post details:", err);
      setError("Failed to load overtime details");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId: string, startTime: string, endTime: string) => {
    if (!confirm("Approve this application?")) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/manager/application-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          action: "APPROVE",
          approvedStartTime: startTime,
          approvedEndTime: endTime,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to approve application");
      }

      alert("Application approved successfully");
      loadPostDetails();
    } catch (err: any) {
      alert(err.message || "Failed to approve application");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (applicationId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/manager/application-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          action: "REJECT",
          rejectionReason: reason,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reject application");
      }

      alert("Application rejected successfully");
      loadPostDetails();
    } catch (err: any) {
      alert(err.message || "Failed to reject application");
    } finally {
      setActionLoading(false);
    }
  };

  const openRemoveModal = (applicationId: string) => {
    setRemoveApplicationId(applicationId);
    setRemoveReason("");
    setShowRemoveModal(true);
  };

  const handleRemoveWorker = async () => {
    if (!removeApplicationId || !removeReason.trim()) {
      alert("Please provide a removal reason");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/cancel-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: removeApplicationId,
          reason: removeReason,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to remove worker");
      }

      alert("Worker removed successfully");
      setShowRemoveModal(false);
      setRemoveApplicationId(null);
      setRemoveReason("");
      loadPostDetails();
    } catch (err: any) {
      alert(err.message || "Failed to remove worker");
    } finally {
      setActionLoading(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <>
        <Header />
        <main className="p-4 max-w-6xl mx-auto">
          <div className="text-center text-zinc-400">Loading...</div>
        </main>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="p-4 max-w-6xl mx-auto">
          <div className="text-center text-zinc-400">Loading overtime details...</div>
        </main>
      </>
    );
  }

  if (error || !post) {
    return (
      <>
        <Header />
        <main className="p-4 max-w-6xl mx-auto">
          <div className="bg-red-500 text-white p-4 rounded-md mb-4">
            {error || "Overtime not found"}
          </div>
          <button
            onClick={() => router.back()}
            className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-md"
          >
            Go Back
          </button>
        </main>
      </>
    );
  }

  const textColor = getTextColor(post.shiftColour.hexColor);

  const pendingApplications = post.allApplications?.filter(app => app.status === "PENDING_APPROVAL") || [];
  const approvedApplications = post.allApplications?.filter(app => app.status === "APPROVED") || [];
  const rejectedApplications = post.allApplications?.filter(app => 
    app.status === "REJECTED_MANUAL" || app.status === "REJECTED_CAPACITY"
  ) || [];
  const cancelledApplications = post.allApplications?.filter(app => 
    app.status === "CANCELLED" || app.status === "CANCEL_PENDING"
  ) || [];

  return (
    <>
      <Header />
      <main className="p-4 max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-md mb-4"
          >
            ← Back
          </button>
          
          <h1 className="text-3xl font-bold text-white mb-2">Overtime Details</h1>
        </div>

        {/* Overtime Info Card */}
        <div
          className="rounded-lg shadow-lg p-6 mb-6"
          style={{ backgroundColor: post.shiftColour.hexColor }}
        >
          <h2 className={`text-2xl font-bold mb-4 ${textColor}`}>
            {post.area.name} - {post.shiftColour.name} Shift
          </h2>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${textColor}`}>
            <div>
              <p className="font-semibold">Date:</p>
              <p className="text-lg">{formatDate(post.date)}</p>
            </div>
            
            <div>
              <p className="font-semibold">Time:</p>
              <p className="text-lg">{post.startTime} - {post.endTime}</p>
            </div>
            
            <div>
              <p className="font-semibold">Slots:</p>
              <p className="text-lg">
                {post.approvedCount} / {post.requiredPeople} filled
                {post.approvedCount > post.requiredPeople && ` (${post.approvedCount - post.requiredPeople} extra)`}
              </p>
            </div>
            
            <div>
              <p className="font-semibold">Status:</p>
              <p className="text-lg">
                {post.approvedCount >= post.requiredPeople ? "FULL" : "Open"}
              </p>
            </div>
          </div>
        </div>

        {/* Accepted Workers Section */}
        <div className="bg-zinc-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            Accepted Workers ({post.acceptedWorkers.length})
          </h2>
          
          {post.acceptedWorkers.length === 0 ? (
            <div className="text-center text-zinc-400 py-8">
              No one accepted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {post.acceptedWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="bg-zinc-700 rounded-md p-4 flex justify-between items-center"
                >
                  <div className="flex-1">
                    <p className="text-white font-semibold text-lg">
                      {worker.user.name}
                    </p>
                    {worker.requestType === "PARTIAL" && worker.approvedStartTime && worker.approvedEndTime ? (
                      <p className="text-zinc-400 text-sm">
                        Working: {worker.approvedStartTime} - {worker.approvedEndTime}
                      </p>
                    ) : (
                      <p className="text-zinc-400 text-sm">
                        Working: {post.startTime} - {post.endTime} (Full shift)
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                      ✓ Approved
                    </span>
                    {isManagerOrAdmin && (
                      <button
                        onClick={() => openRemoveModal(worker.id)}
                        disabled={actionLoading}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm font-semibold disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Manager/Admin Section - All Applications */}
        {isManagerOrAdmin && post.allApplications && (
          <div className="space-y-6">
            {/* Pending Applications */}
            {pendingApplications.length > 0 && (
              <div className="bg-zinc-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Pending Applications ({pendingApplications.length})
                </h2>
                <div className="space-y-3">
                  {pendingApplications.map((app) => (
                    <div key={app.id} className="bg-zinc-700 rounded-md p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-white font-semibold text-lg">
                            {app.user.name}
                          </p>
                          <p className="text-zinc-400 text-sm">{app.user.email}</p>
                        </div>
                        <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs">
                          PENDING
                        </span>
                      </div>
                      
                      <div className="text-zinc-300 text-sm mb-3">
                        {app.requestType === "FULL" ? (
                          <p>Requested: Full shift ({post.startTime} - {post.endTime})</p>
                        ) : (
                          <p>Requested: {app.requestedStartTime} - {app.requestedEndTime}</p>
                        )}
                        {app.comment && (
                          <p className="mt-1 text-zinc-400">Comment: {app.comment}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(
                            app.id,
                            app.requestedStartTime || post.startTime,
                            app.requestedEndTime || post.endTime
                          )}
                          disabled={actionLoading}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                        >
                          Approve
                          {post.approvedCount >= post.requiredPeople && " Anyway (Override)"}
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          disabled={actionLoading}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejected Applications */}
            {rejectedApplications.length > 0 && (
              <div className="bg-zinc-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Rejected Applications ({rejectedApplications.length})
                </h2>
                <div className="space-y-2">
                  {rejectedApplications.map((app) => (
                    <div key={app.id} className="bg-zinc-700 rounded-md p-3 flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{app.user.name}</p>
                        <p className="text-zinc-400 text-sm">
                          {app.status === "REJECTED_CAPACITY" ? "Auto-rejected (Capacity)" : "Manually rejected"}
                        </p>
                      </div>
                      <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                        REJECTED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancelled Applications */}
            {cancelledApplications.length > 0 && (
              <div className="bg-zinc-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Cancelled Applications ({cancelledApplications.length})
                </h2>
                <div className="space-y-2">
                  {cancelledApplications.map((app) => (
                    <div key={app.id} className="bg-zinc-700 rounded-md p-3 flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{app.user.name}</p>
                        <p className="text-zinc-400 text-sm">
                          {app.status === "CANCEL_PENDING" ? "Cancellation pending approval" : "Cancelled"}
                        </p>
                      </div>
                      <span className="bg-gray-600 text-white px-2 py-1 rounded text-xs">
                        {app.status === "CANCEL_PENDING" ? "CANCEL PENDING" : "CANCELLED"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Remove Worker Modal */}
        {showRemoveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-4">Remove Worker</h2>
              
              <p className="text-zinc-300 mb-4">
                Please provide a reason for removing this worker:
              </p>
              
              <textarea
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                className="w-full bg-zinc-700 text-white border border-zinc-600 rounded-md p-3 mb-4 min-h-[100px]"
                placeholder="Enter removal reason..."
                required
              />
              
              <div className="flex gap-2">
                <button
                  onClick={handleRemoveWorker}
                  disabled={actionLoading || !removeReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-semibold disabled:opacity-50"
                >
                  {actionLoading ? "Removing..." : "Confirm Remove"}
                </button>
                <button
                  onClick={() => {
                    setShowRemoveModal(false);
                    setRemoveApplicationId(null);
                    setRemoveReason("");
                  }}
                  disabled={actionLoading}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-md font-semibold disabled:opacity-50"
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
