"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { use } from "react";
import Header from "../../../components/Header";
import { CheckIcon, XMarkIcon, ArrowLeftIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

type Application = {
  id: string;
  requestType: string;
  requestedStartTime: string | null;
  requestedEndTime: string | null;
  comment: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type OvertimePost = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredPeople: number;
  approvedCount: number;
  status: string;
  area: {
    name: string;
  };
  shiftColour: {
    name: string;
    hexColor: string;
  };
  applications: Application[];
};

export default function OvertimePostApplicationsPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [post, setPost] = useState<OvertimePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedApplicationForCancel, setSelectedApplicationForCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const userRole = (session?.user as { role?: string })?.role;
      if (userRole !== "MANAGER" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
        router.push("/");
      } else {
        loadPost();
      }
    }
  }, [status, session, router]);

  const loadPost = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/manager/overtime-posts/${resolvedParams.postId}`);
      if (!res.ok) throw new Error("Failed to fetch overtime post");
      const data = await res.json();
      setPost(data);
    } catch (err) {
      console.error("Failed to load post:", err);
      setError("Failed to load overtime post");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId: string) => {
    if (!post) return;
    
    setProcessingId(applicationId);
    setError(null);
    
    try {
      const res = await fetch("/api/manager/application-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          action: "APPROVE",
          approvedStartTime: post.startTime,
          approvedEndTime: post.endTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve application");
      }

      await loadPost();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (applicationId: string) => {
    const reason = prompt("Please provide a rejection reason:");
    if (!reason) return;

    setProcessingId(applicationId);
    setError(null);
    
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
        const data = await res.json();
        throw new Error(data.error || "Failed to reject application");
      }

      await loadPost();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelOvertimeForUser = async () => {
    if (!selectedApplicationForCancel || !cancelReason.trim()) {
      setError("Please provide a cancellation reason");
      return;
    }

    setProcessingId(selectedApplicationForCancel);
    setError(null);
    
    try {
      const res = await fetch("/api/admin/cancel-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedApplicationForCancel,
          reason: cancelReason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel application");
      }

      setShowCancelModal(false);
      setSelectedApplicationForCancel(null);
      setCancelReason("");
      await loadPost();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveCancellation = async (applicationId: string) => {
    if (!confirm("Are you sure you want to approve this cancellation request?")) {
      return;
    }

    setProcessingId(applicationId);
    setError(null);
    
    try {
      const res = await fetch("/api/manager/cancellation-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          action: "APPROVE",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve cancellation");
      }

      await loadPost();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectCancellation = async (applicationId: string) => {
    const reason = prompt("Please provide a reason for rejecting this cancellation request:");
    if (!reason) return;

    setProcessingId(applicationId);
    setError(null);
    
    try {
      const res = await fetch("/api/manager/cancellation-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          action: "REJECT",
          rejectionReason: reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject cancellation");
      }

      await loadPost();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Header />
        <main className="p-4 max-w-6xl mx-auto">
          <div className="text-center text-zinc-400">Loading...</div>
        </main>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Header />
        <main className="p-4 max-w-6xl mx-auto">
          <div className="text-center text-red-400">Overtime post not found</div>
        </main>
      </>
    );
  }

  const pendingApplications = post.applications.filter(app => app.status === "PENDING_APPROVAL");
  const approvedApplications = post.applications.filter(app => app.status === "APPROVED");
  const rejectedApplications = post.applications.filter(app => app.status.startsWith("REJECTED"));
  const cancelPendingApplications = post.applications.filter(app => app.status === "CANCEL_PENDING");
  const cancelledApplications = post.applications.filter(app => app.status === "CANCELLED" || app.status === "WITHDRAWN");

  return (
    <>
      <Header />
      <main className="p-4 max-w-6xl mx-auto space-y-6">
        <Link
          href="/manager/overtime-posts"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Overtime Posts
        </Link>

        {/* Post Details */}
        <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: post.shiftColour.hexColor }}
            />
            <h1 className="text-3xl font-bold text-white">
              {post.shiftColour.name} Shift - {post.area.name}
            </h1>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-zinc-400">Date</div>
              <div className="text-lg font-semibold text-white">
                {new Date(post.date).toDateString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-zinc-400">Time</div>
              <div className="text-lg font-semibold text-white">
                {post.startTime} – {post.endTime}
              </div>
            </div>
            <div>
              <div className="text-sm text-zinc-400">Required / Approved</div>
              <div className="text-lg font-semibold text-white">
                {post.requiredPeople} / {post.approvedCount}
              </div>
            </div>
            <div>
              <div className="text-sm text-zinc-400">Slots Available</div>
              <div className="text-lg font-semibold text-white">
                {post.requiredPeople - post.approvedCount}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 border-2 border-red-500 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {/* Pending Applications */}
        {pendingApplications.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Pending Applications ({pendingApplications.length})
            </h2>
            <div className="space-y-4">
              {pendingApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-6 rounded-xl border-2 bg-zinc-800 border-yellow-500/50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{app.user.name}</h3>
                      <p className="text-sm text-zinc-400">{app.user.email}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Applied: {new Date(app.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-white">
                      ⏳ PENDING
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-zinc-300">
                      <strong>Type:</strong> {app.requestType === "FULL" ? "Full Shift" : "Partial Availability"}
                    </div>
                    {app.requestType === "PARTIAL" && (
                      <div className="text-sm text-zinc-300">
                        <strong>Requested Hours:</strong> {app.requestedStartTime} – {app.requestedEndTime}
                      </div>
                    )}
                    {app.comment && (
                      <div className="mt-2 p-3 bg-zinc-700/50 rounded-lg">
                        <strong className="text-white text-sm">Comment:</strong>
                        <p className="text-zinc-300 text-sm mt-1">{app.comment}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={processingId === app.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors disabled:opacity-50"
                    >
                      <CheckIcon className="w-5 h-5" />
                      {processingId === app.id ? "Approving..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleReject(app.id)}
                      disabled={processingId === app.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50"
                    >
                      <XMarkIcon className="w-5 h-5" />
                      {processingId === app.id ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Applications */}
        {approvedApplications.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Approved Applications ({approvedApplications.length})
            </h2>
            <div className="space-y-3">
              {approvedApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-lg bg-green-900/20 border border-green-500/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{app.user.name}</div>
                      <div className="text-sm text-zinc-400">{app.user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white">
                        ✓ APPROVED
                      </span>
                      <button
                        onClick={() => {
                          setSelectedApplicationForCancel(app.id);
                          setShowCancelModal(true);
                        }}
                        disabled={processingId === app.id}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition-colors disabled:opacity-50"
                      >
                        Cancel Overtime
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rejected Applications */}
        {rejectedApplications.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Rejected Applications ({rejectedApplications.length})
            </h2>
            <div className="space-y-3">
              {rejectedApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-lg bg-red-900/20 border border-red-500/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{app.user.name}</div>
                      <div className="text-sm text-zinc-400">{app.user.email}</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                      ✗ REJECTED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancellation Pending Applications */}
        {cancelPendingApplications.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Cancellation Pending ({cancelPendingApplications.length})
            </h2>
            <div className="space-y-4">
              {cancelPendingApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-6 rounded-xl border-2 bg-zinc-800 border-orange-500/50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{app.user.name}</h3>
                      <p className="text-sm text-zinc-400">{app.user.email}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Applied: {new Date(app.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-600 text-white">
                      ⚠️ CANCEL PENDING
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-zinc-300">
                      <strong>Type:</strong> {app.requestType === "FULL" ? "Full Shift" : "Partial Availability"}
                    </div>
                    {app.requestType === "PARTIAL" && (
                      <div className="text-sm text-zinc-300">
                        <strong>Requested Hours:</strong> {app.requestedStartTime} – {app.requestedEndTime}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveCancellation(app.id)}
                      disabled={processingId === app.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors disabled:opacity-50"
                    >
                      <CheckIcon className="w-5 h-5" />
                      {processingId === app.id ? "Approving..." : "Approve Cancellation"}
                    </button>
                    <button
                      onClick={() => handleRejectCancellation(app.id)}
                      disabled={processingId === app.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50"
                    >
                      <XMarkIcon className="w-5 h-5" />
                      {processingId === app.id ? "Rejecting..." : "Reject Cancellation"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cancelled/Withdrawn Applications */}
        {cancelledApplications.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Cancelled/Withdrawn ({cancelledApplications.length})
            </h2>
            <div className="space-y-3">
              {cancelledApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-lg bg-gray-900/20 border border-gray-500/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{app.user.name}</div>
                      <div className="text-sm text-zinc-400">{app.user.email}</div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-600 text-white">
                      {app.status === "WITHDRAWN" ? "↩️ WITHDRAWN" : "✗ CANCELLED"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Cancel Application Modal */}
      {showCancelModal && selectedApplicationForCancel && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 rounded-2xl p-6 max-w-lg w-full border-2 border-zinc-700">
            <h2 className="text-2xl font-bold text-white mb-4">
              Cancel Overtime Assignment
            </h2>

            <p className="text-zinc-300 mb-4">
              Please provide a reason for cancelling this user's overtime assignment. The user will be notified via email.
            </p>

            <div className="mb-4">
              <label className="block text-white font-semibold mb-2">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Explain why this overtime assignment is being cancelled..."
                className="w-full px-4 py-2 bg-zinc-700 text-white rounded-lg border border-zinc-600 focus:border-blue-500 focus:outline-none"
                rows={4}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedApplicationForCancel(null);
                  setCancelReason("");
                }}
                disabled={processingId === selectedApplicationForCancel}
                className="flex-1 py-3 rounded-xl bg-zinc-600 hover:bg-zinc-700 text-white font-bold transition-colors disabled:opacity-50"
              >
                Close
              </button>
              <button
                onClick={handleCancelOvertimeForUser}
                disabled={!cancelReason.trim() || processingId === selectedApplicationForCancel}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50"
              >
                {processingId === selectedApplicationForCancel ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
