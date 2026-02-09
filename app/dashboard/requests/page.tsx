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

  useEffect(() => {
    if (status === "unauthenticated") {
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

  if (status === "loading" || status === "unauthenticated") {
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

            return (
              <div
                key={app.id}
                className={`p-6 rounded-xl border-2 ${
                  isPending
                    ? "bg-zinc-800 border-yellow-500/50"
                    : isApproved
                    ? "bg-green-900/20 border-green-500/50"
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
                  <div className="p-3 bg-green-900/30 rounded-lg border border-green-500/50">
                    <strong className="text-green-300 text-sm">Approved Hours:</strong>
                    <p className="text-green-200 text-sm mt-1">
                      {app.approvedStartTime} – {app.approvedEndTime}
                    </p>
                  </div>
                )}

                {isRejected && app.rejectionReason && (
                  <div className="p-3 bg-red-900/30 rounded-lg border border-red-500/50">
                    <strong className="text-red-300 text-sm">Rejection Reason:</strong>
                    <p className="text-red-200 text-sm mt-1">{app.rejectionReason}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
