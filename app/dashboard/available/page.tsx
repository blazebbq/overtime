"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";

type Area = {
  id: string;
  name: string;
};

type ShiftColour = {
  id: string;
  name: string;
  hexColor: string;
};

type Overtime = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredPeople: number;
  approvedCount: number;
  area: Area;
  shiftColour: ShiftColour;
  userApplication?: {
    id: string;
    status: string;
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

export default function AvailableOvertimePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [overtime, setOvertime] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedOvertimeId, setSelectedOvertimeId] = useState<string | null>(null);
  const [applicationType, setApplicationType] = useState<"FULL" | "PARTIAL">("FULL");
  const [partialStartTime, setPartialStartTime] = useState("");
  const [partialEndTime, setPartialEndTime] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [showCancellationRequestModal, setShowCancellationRequestModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadAreas();
    }
  }, [status]);

  useEffect(() => {
    if (selectedAreaId && status === "authenticated") {
      loadOvertime();
    }
  }, [selectedAreaId, status]);

  const loadAreas = async () => {
    try {
      const res = await fetch("/api/areas");
      if (!res.ok) throw new Error("Failed to fetch areas");
      const data = await res.json();
      setAreas(data);
      if (data.length > 0) {
        setSelectedAreaId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load areas:", err);
      setError("Failed to load areas");
    }
  };

  const loadOvertime = useCallback(async () => {
    if (!selectedAreaId) return;
    
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        areaId: selectedAreaId,
        availableOnly: "true",
      });
      const res = await fetch(`/api/overtime?${params}`);
      if (!res.ok) throw new Error("Failed to fetch overtime");
      const data = await res.json();
      setOvertime(data);
    } catch (err) {
      console.error("Failed to load overtime:", err);
      setError("Failed to load overtime");
    } finally {
      setLoading(false);
    }
  }, [selectedAreaId]);

  const openApplicationModal = (overtimeId: string, type: "FULL" | "PARTIAL") => {
    setSelectedOvertimeId(overtimeId);
    setApplicationType(type);
    setPartialStartTime("");
    setPartialEndTime("");
    setComment("");
    setShowApplicationModal(true);
  };

  const closeApplicationModal = () => {
    setShowApplicationModal(false);
    setSelectedOvertimeId(null);
  };

  const submitApplication = async () => {
    if (!selectedOvertimeId) return;

    const selectedOT = overtime.find(ot => ot.id === selectedOvertimeId);
    if (!selectedOT) return;

    // Validation for PARTIAL
    if (applicationType === "PARTIAL") {
      if (!partialStartTime || !partialEndTime) {
        setError("Please provide both start and end times");
        return;
      }

      const parseTime = (time: string) => {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      };

      const overtimeStart = parseTime(selectedOT.startTime);
      const overtimeEnd = parseTime(selectedOT.endTime);
      const requestedStart = parseTime(partialStartTime);
      const requestedEnd = parseTime(partialEndTime);

      if (requestedStart < overtimeStart || requestedEnd > overtimeEnd) {
        setError("Requested times must fall within the shift hours");
        return;
      }

      if (requestedEnd <= requestedStart) {
        setError("End time must be after start time");
        return;
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      const body: {
        overtimeId: string;
        requestType: string;
        requestedStartTime?: string;
        requestedEndTime?: string;
        comment?: string;
      } = {
        overtimeId: selectedOvertimeId,
        requestType: applicationType,
      };

      if (applicationType === "PARTIAL") {
        body.requestedStartTime = partialStartTime;
        body.requestedEndTime = partialEndTime;
      }

      if (comment) {
        body.comment = comment;
      }

      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit application");
      }

      closeApplicationModal();
      await loadOvertime(); // Refresh to get updated status
      alert("Application submitted successfully! You will receive an email when it's reviewed.");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Failed to submit application:", error);
      setError(error.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (applicationId: string) => {
    if (!confirm("Are you sure you want to cancel this application?")) {
      return;
    }

    try {
      const res = await fetch("/api/applications/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel application");
      }

      await loadOvertime(); // Refresh to get updated status
      alert("Application cancelled successfully!");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Failed to cancel application:", error);
      setError(error.message || "Failed to cancel application");
    }
  };

  const handleRequestCancellation = async (applicationId: string) => {
    if (!cancellationReason.trim()) {
      setError("Please provide a reason for cancellation");
      return;
    }

    try {
      const res = await fetch("/api/applications/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          reason: cancellationReason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to request cancellation");
      }

      setShowCancellationRequestModal(false);
      setSelectedApplicationId(null);
      setCancellationReason("");
      await loadOvertime(); // Refresh to get updated status
      alert("Cancellation request submitted successfully! You will receive an email when it's reviewed.");
    } catch (err: unknown) {
      const error = err as Error;
      console.error("Failed to request cancellation:", error);
      setError(error.message || "Failed to request cancellation");
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

  const selectedOvertime = overtime.find(ot => ot.id === selectedOvertimeId);

  return (
    <>
      <Header />
      <main className="p-4 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Available Overtime</h1>
            <p className="text-zinc-400">Apply for open overtime opportunities</p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Area Selection */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white">Select Area</h2>
          {areas.length === 0 ? (
            <div className="text-center text-zinc-400">No areas available</div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {areas.map((area) => (
                <button
                  key={area.id}
                  onClick={() => setSelectedAreaId(area.id)}
                  className={`px-6 py-3 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 ${
                    selectedAreaId === area.id
                      ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/50"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-2 border-zinc-600"
                  }`}
                >
                  {area.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 border-2 border-red-500 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {loading && selectedAreaId && (
          <div className="text-center text-zinc-400">Loading overtime...</div>
        )}

        {!loading && selectedAreaId && overtime.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔒</div>
            <p className="text-zinc-400 text-lg">
              No available overtime in this area
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overtime.map((ot) => {
            const userApplication = ot.userApplication;
            const applicationStatus = userApplication?.status;
            const isFull = ot.approvedCount >= ot.requiredPeople;

            const bgColor = ot.shiftColour.hexColor;
            const lightBgColor = lightenColor(bgColor, 20);
            const textColor = getTextColor(bgColor);

            return (
              <div
                key={ot.id}
                className="rounded-2xl p-6 border-2 shadow-2xl transform transition-all duration-300 hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${bgColor} 0%, ${lightBgColor} 100%)`,
                  borderColor: bgColor,
                }}
              >
                <div className={`text-2xl font-bold mb-1 ${textColor}`}>
                  {ot.shiftColour.name} Shift
                </div>
                <div className={`text-sm mb-3 ${textColor} opacity-80 font-semibold`}>
                  📍 {ot.area.name}
                </div>

                <div className={`text-sm mb-4 ${textColor} opacity-90`}>
                  <div className="font-medium">
                    📅 {new Date(ot.date).toDateString()}
                  </div>
                  <div className="font-medium">
                    🕐 {ot.startTime} – {ot.endTime}
                  </div>
                </div>

                <div className={`text-sm mb-4 font-semibold ${textColor}`}>
                  {ot.approvedCount}/{ot.requiredPeople} Approved
                  {isFull ? (
                    <span className="ml-2 px-2 py-1 bg-green-600 text-white rounded-full text-xs">
                      ✓ FULL
                    </span>
                  ) : (
                    <span className="ml-2 px-2 py-1 bg-red-500 text-white rounded-full text-xs">
                      {ot.requiredPeople - ot.approvedCount} needed
                    </span>
                  )}
                </div>

                {/* Show different states based on application status */}
                {applicationStatus === "PENDING_APPROVAL" && userApplication ? (
                  <div className="space-y-2">
                    <div className="w-full py-3 px-4 rounded-xl bg-yellow-500 text-white font-bold text-center">
                      ⏳ Pending Approval
                    </div>
                    <button
                      onClick={() => handleCancelRequest(userApplication.id)}
                      className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
                    >
                      Cancel Request
                    </button>
                  </div>
                ) : applicationStatus === "APPROVED" && userApplication ? (
                  <div className="space-y-2">
                    <div className="w-full py-3 px-4 rounded-xl bg-green-600 text-white font-bold text-center">
                      ✓ Approved
                    </div>
                    <button
                      onClick={() => {
                        setSelectedApplicationId(userApplication.id);
                        setShowCancellationRequestModal(true);
                      }}
                      className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors"
                    >
                      Request Cancellation
                    </button>
                  </div>
                ) : applicationStatus === "CANCEL_PENDING" ? (
                  <div className="w-full py-3 px-4 rounded-xl bg-orange-500 text-white font-bold text-center">
                    ⚠️ Cancellation Pending
                  </div>
                ) : applicationStatus === "REJECTED_MANUAL" || applicationStatus === "REJECTED_CAPACITY" ? (
                  <div className="space-y-2">
                    <div className="w-full py-3 px-4 rounded-xl bg-red-500 text-white font-bold text-center">
                      ✗ Rejected
                    </div>
                    {!isFull && (
                      <div className="space-y-2">
                        <button
                          onClick={() => openApplicationModal(ot.id, "FULL")}
                          className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                        >
                          Apply Again (Full Shift)
                        </button>
                        <button
                          onClick={() => openApplicationModal(ot.id, "PARTIAL")}
                          className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
                        >
                          Apply Again (Different Hours)
                        </button>
                      </div>
                    )}
                  </div>
                ) : applicationStatus === "CANCELLED" ? (
                  <div className="space-y-2">
                    <div className="w-full py-3 px-4 rounded-xl bg-gray-500 text-white font-bold text-center">
                      ✗ Cancelled
                    </div>
                    {!isFull && (
                      <div className="space-y-2">
                        <button
                          onClick={() => openApplicationModal(ot.id, "FULL")}
                          className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors"
                        >
                          Apply Again (Full Shift)
                        </button>
                        <button
                          onClick={() => openApplicationModal(ot.id, "PARTIAL")}
                          className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors"
                        >
                          Apply Again (Different Hours)
                        </button>
                      </div>
                    )}
                  </div>
                ) : isFull ? (
                  <div className="w-full py-3 px-4 rounded-xl bg-gray-500 text-white font-bold text-center">
                    Fully Staffed
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => openApplicationModal(ot.id, "FULL")}
                      className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all duration-200 shadow-lg hover:shadow-blue-500/50"
                    >
                      ✓ Apply for Full Shift
                    </button>
                    <button
                      onClick={() => openApplicationModal(ot.id, "PARTIAL")}
                      className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
                    >
                      ⏱ Apply with Different Hours
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Application Modal */}
      {showApplicationModal && selectedOvertime && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 rounded-2xl p-6 max-w-lg w-full border-2 border-zinc-700">
            <h2 className="text-2xl font-bold text-white mb-4">
              {applicationType === "FULL" ? "Apply for Full Shift" : "Apply with Different Hours"}
            </h2>

            <div className="mb-4 p-4 bg-zinc-700 rounded-lg">
              <div className="text-white font-semibold mb-2">
                {selectedOvertime.shiftColour.name} Shift - {selectedOvertime.area.name}
              </div>
              <div className="text-zinc-300 text-sm">
                📅 {new Date(selectedOvertime.date).toDateString()}
              </div>
              <div className="text-zinc-300 text-sm">
                🕐 {selectedOvertime.startTime} – {selectedOvertime.endTime}
              </div>
            </div>

            {applicationType === "PARTIAL" && (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Requested Start Time
                  </label>
                  <input
                    type="time"
                    value={partialStartTime}
                    onChange={(e) => setPartialStartTime(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-700 text-white rounded-lg border border-zinc-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-white font-semibold mb-2">
                    Requested End Time
                  </label>
                  <input
                    type="time"
                    value={partialEndTime}
                    onChange={(e) => setPartialEndTime(e.target.value)}
                    className="w-full px-4 py-2 bg-zinc-700 text-white rounded-lg border border-zinc-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-white font-semibold mb-2">
                Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any additional notes..."
                className="w-full px-4 py-2 bg-zinc-700 text-white rounded-lg border border-zinc-600 focus:border-blue-500 focus:outline-none"
                rows={3}
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={closeApplicationModal}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-zinc-600 hover:bg-zinc-700 text-white font-bold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitApplication}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Request Modal */}
      {showCancellationRequestModal && selectedApplicationId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 rounded-2xl p-6 max-w-lg w-full border-2 border-zinc-700">
            <h2 className="text-2xl font-bold text-white mb-4">
              Request Cancellation
            </h2>

            <p className="text-zinc-300 mb-4">
              Please provide a reason for your cancellation request. This will be reviewed by your manager.
            </p>

            <div className="mb-4">
              <label className="block text-white font-semibold mb-2">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please explain why you need to cancel this approved overtime..."
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
                  setShowCancellationRequestModal(false);
                  setSelectedApplicationId(null);
                  setCancellationReason("");
                }}
                className="flex-1 py-3 rounded-xl bg-zinc-600 hover:bg-zinc-700 text-white font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRequestCancellation(selectedApplicationId)}
                disabled={!cancellationReason.trim()}
                className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-colors disabled:opacity-50"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
