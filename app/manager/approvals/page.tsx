"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/solid";

type Application = {
  id: string;
  requestType: string;
  requestedStartTime: string | null;
  requestedEndTime: string | null;
  comment: string | null;
  status: string;
  createdAt: string;
  cancellationRequestedAt?: string | null;
  cancellationRequestedReason?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
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

export default function ManagerApprovalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [newApplications, setNewApplications] = useState<Application[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const userRole = (session?.user as { role?: string })?.role;
      if (userRole !== "MANAGER" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
        router.push("/");
      } else {
        loadApplications();
      }
    }
  }, [status, session, router]);

  const loadApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load new applications
      const newRes = await fetch("/api/manager/application-approvals?status=PENDING_APPROVAL");
      if (!newRes.ok) throw new Error("Failed to fetch new applications");
      const newData = await newRes.json();
      setNewApplications(newData);

      // Load cancellation requests
      const cancelRes = await fetch("/api/manager/cancellation-approvals");
      if (!cancelRes.ok) throw new Error("Failed to fetch cancellation requests");
      const cancelData = await cancelRes.json();
      setCancellationRequests(cancelData);
    } catch (err) {
      console.error("Failed to load applications:", err);
      setError("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId: string, overtime: Application["overtime"]) => {
    setProcessingId(applicationId);
    setError(null);
    
    try {
      const res = await fetch("/api/manager/application-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          action: "APPROVE",
          approvedStartTime: overtime.startTime,
          approvedEndTime: overtime.endTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to approve application");
      }

      await loadApplications();
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

      await loadApplications();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveCancellation = async (applicationId: string) => {
    if (!confirm("Are you sure you want to approve this cancellation? This will free up the overtime slot.")) {
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

      await loadApplications();
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectCancellation = async (applicationId: string) => {
    if (!confirm("Are you sure you want to reject this cancellation? The user will remain assigned to this overtime.")) {
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
          action: "REJECT",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reject cancellation");
      }

      await loadApplications();
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

  return (
    <>
      <Header />
      <main className="p-4 max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Manager Approvals</h1>
          <p className="text-zinc-400">Review and approve overtime applications and cancellations from your team</p>
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 border-2 border-red-500 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {/* New Applications Section */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">New Applications</h2>
          
          {newApplications.length === 0 ? (
            <div className="text-center py-8 bg-zinc-800/50 rounded-xl border-2 border-zinc-700">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-zinc-400">No pending applications to review</p>
            </div>
          ) : (
            <div className="space-y-4">
              {newApplications.map((app) => (
                <div
                  key={app.id}
                  className="p-6 rounded-xl border-2 bg-zinc-800 border-yellow-500/50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: app.overtime.shiftColour.hexColor }}
                        />
                        <h3 className="text-xl font-bold text-white">
                          {app.overtime.shiftColour.name} Shift - {app.overtime.area.name}
                        </h3>
                      </div>
                      <p className="text-sm text-zinc-400">
                        Requested by: <span className="text-white font-semibold">{app.user.name}</span> ({app.user.email})
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-white">
                      ⏳ PENDING
                    </span>
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
                    <div className="text-sm text-zinc-300">
                      <strong className="text-white">Applied:</strong>{" "}
                      {new Date(app.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {app.comment && (
                    <div className="mb-4 p-3 bg-zinc-700/50 rounded-lg">
                      <strong className="text-white text-sm">User Comment:</strong>
                      <p className="text-zinc-300 text-sm mt-1">{app.comment}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(app.id, app.overtime)}
                      disabled={processingId === app.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckIcon className="w-5 h-5" />
                      {processingId === app.id ? "Approving..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleReject(app.id)}
                      disabled={processingId === app.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XMarkIcon className="w-5 h-5" />
                      {processingId === app.id ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Cancellation Requests Section */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Cancellation Requests</h2>
          
          {cancellationRequests.length === 0 ? (
            <div className="text-center py-8 bg-zinc-800/50 rounded-xl border-2 border-zinc-700">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-zinc-400">No pending cancellation requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cancellationRequests.map((app) => (
                <div
                  key={app.id}
                  className="p-6 rounded-xl border-2 bg-zinc-800 border-orange-500/50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: app.overtime.shiftColour.hexColor }}
                        />
                        <h3 className="text-xl font-bold text-white">
                          {app.overtime.shiftColour.name} Shift - {app.overtime.area.name}
                        </h3>
                      </div>
                      <p className="text-sm text-zinc-400">
                        Requested by: <span className="text-white font-semibold">{app.user.name}</span> ({app.user.email})
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-500 text-white">
                      🔄 CANCELLATION
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="text-sm text-zinc-300">
                      <strong className="text-white">Date:</strong>{" "}
                      {new Date(app.overtime.date).toDateString()}
                    </div>
                    <div className="text-sm text-zinc-300">
                      <strong className="text-white">Shift Hours:</strong>{" "}
                      {app.overtime.startTime} – {app.overtime.endTime}
                    </div>
                    <div className="text-sm text-zinc-300">
                      <strong className="text-white">Requested:</strong>{" "}
                      {new Date(app.cancellationRequestedAt || app.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {app.cancellationRequestedReason && (
                    <div className="mb-4 p-3 bg-orange-900/30 rounded-lg border border-orange-500/50">
                      <strong className="text-orange-300 text-sm">Cancellation Reason:</strong>
                      <p className="text-orange-200 text-sm mt-1">{app.cancellationRequestedReason}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveCancellation(app.id)}
                      disabled={processingId === app.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckIcon className="w-5 h-5" />
                      {processingId === app.id ? "Approving..." : "Approve Cancellation"}
                    </button>
                    <button
                      onClick={() => handleRejectCancellation(app.id)}
                      disabled={processingId === app.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XMarkIcon className="w-5 h-5" />
                      {processingId === app.id ? "Rejecting..." : "Reject Cancellation"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
