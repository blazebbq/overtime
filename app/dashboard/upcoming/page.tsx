"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";
import CancellationRequestModal from "../../components/CancellationRequestModal";

type Application = {
  id: string;
  status: string;
  approvedStartTime: string | null;
  approvedEndTime: string | null;
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

function getTextColor(hexColor: string): string {
  if (!hexColor || !/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
    return "text-white";
  }
  
  const luminance = parseInt(hexColor.slice(1, 3), 16) * 0.299 +
                   parseInt(hexColor.slice(3, 5), 16) * 0.587 +
                   parseInt(hexColor.slice(5, 7), 16) * 0.114;
  return luminance < 128 ? "text-white" : "text-gray-900";
}

function lightenColor(hex: string, percent: number): string {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return hex;
  }
  
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
  
  return "#" + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

export default function UpcomingOvertimePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancellationRequestModal, setShowCancellationRequestModal] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadUpcoming();
    }
  }, [status]);

  const loadUpcoming = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/applications/my-upcoming");
      if (!res.ok) throw new Error("Failed to fetch upcoming overtime");
      const data = await res.json();
      setApplications(data);
    } catch (err) {
      console.error("Failed to load upcoming overtime:", err);
      setError("Failed to load upcoming overtime");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCancellation = async (reason: string) => {
    if (!selectedApplicationId) return;

    const res = await fetch("/api/applications/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: selectedApplicationId,
        cancellationReason: reason,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to request cancellation");
    }

    setShowCancellationRequestModal(false);
    setSelectedApplicationId(null);
    await loadUpcoming(); // Refresh to get updated list
    alert("Cancellation request submitted successfully! You will receive an email when it's reviewed.");
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
            <h1 className="text-3xl font-bold text-white">My Upcoming Overtime</h1>
            <p className="text-zinc-400">Your approved future shifts</p>
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
            <div className="text-6xl mb-4">📅</div>
            <p className="text-zinc-400 text-lg mb-4">
              No upcoming overtime shifts
            </p>
            <Link
              href="/dashboard/available"
              className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Browse Available Overtime
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {applications.map((app) => {
            const bgColor = app.overtime.shiftColour.hexColor;
            const lightBgColor = lightenColor(bgColor, 20);
            const textColor = getTextColor(bgColor);
            const displayStartTime = app.approvedStartTime || app.overtime.startTime;
            const displayEndTime = app.approvedEndTime || app.overtime.endTime;
            const isCancelPending = app.status === "CANCEL_PENDING";

            return (
              <div
                key={app.id}
                className="rounded-2xl p-6 shadow-2xl border-2 transform transition-all duration-300 hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${bgColor} 0%, ${lightBgColor} 100%)`,
                  borderColor: bgColor,
                }}
              >
                <div className={`text-2xl font-bold mb-1 ${textColor}`}>
                  {app.overtime.shiftColour.name} Shift
                </div>
                <div className={`text-sm mb-3 ${textColor} opacity-80 font-semibold`}>
                  📍 {app.overtime.area.name}
                </div>

                <div className={`text-sm mb-4 ${textColor} opacity-90`}>
                  <div className="font-medium">
                    📅 {new Date(app.overtime.date).toDateString()}
                  </div>
                  <div className="font-medium">
                    🕐 {displayStartTime} – {displayEndTime}
                  </div>
                </div>

                {isCancelPending ? (
                  <>
                    <div className={`text-xs ${textColor} opacity-75 bg-orange-600/80 rounded-lg p-2 mb-2`}>
                      <span className="font-semibold">⏳ CANCELLATION PENDING</span>
                    </div>
                    {app.assignedManager && (
                      <div className={`text-xs ${textColor} opacity-75 bg-white/20 rounded-lg p-2 mb-3`}>
                        <span className="font-semibold">Waiting with: {app.assignedManager.name}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className={`text-xs ${textColor} opacity-75 bg-white/20 rounded-lg p-2 mb-3`}>
                      <span className="font-semibold">✓ APPROVED</span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedApplicationId(app.id);
                        setSelectedApplication(app);
                        setShowCancellationRequestModal(true);
                      }}
                      className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors shadow-lg"
                    >
                      Request Cancellation
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Cancellation Request Modal */}
      <CancellationRequestModal
        isOpen={showCancellationRequestModal}
        onClose={() => {
          setShowCancellationRequestModal(false);
          setSelectedApplicationId(null);
          setSelectedApplication(null);
        }}
        onSubmit={handleRequestCancellation}
        applicationId={selectedApplicationId || ""}
        overtimeDetails={
          selectedApplication
            ? {
                date: new Date(selectedApplication.overtime.date).toDateString(),
                area: selectedApplication.overtime.area.name,
                shiftColour: selectedApplication.overtime.shiftColour.name,
              }
            : undefined
        }
      />
    </>
  );
}
