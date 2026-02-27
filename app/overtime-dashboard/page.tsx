"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";
import CancellationRequestModal from "@/app/components/CancellationRequestModal";
import FilterDropdown from "@/app/components/FilterDropdown";

type Overtime = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  area: { name: string };
  shiftColour: { name: string; hexColor: string };
  areaShiftColour?: { area: { name: string }; shiftColour: { name: string; hexColor: string } };
  requiredPeople: number;
  approvedCount: number;
  status: string;
  acceptedWorkers: { name: string }[];
  userApplication?: {
    id: string;
    status: string;
    assignedManager?: { name: string };
    cancellationRequestedReason?: string;
    cancellationRequestedAt?: string;
    user?: { name: string };
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

export default function OvertimeDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  
  // Filters
  const [showAvailable, setShowAvailable] = useState(true);
  const [showMyApproved, setShowMyApproved] = useState(true);
  const [showMyPending, setShowMyPending] = useState(true);
  const [showCancellationPending, setShowCancellationPending] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Application modal state
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedOvertime, setSelectedOvertime] = useState<Overtime | null>(null);
  const [applicationType, setApplicationType] = useState<"FULL" | "PARTIAL">("FULL");
  const [partialStartTime, setPartialStartTime] = useState("");
  const [partialEndTime, setPartialEndTime] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Cancellation modal state
  const [showCancellationRequestModal, setShowCancellationRequestModal] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedCancellationOvertime, setSelectedCancellationOvertime] = useState<Overtime | null>(null);

  useEffect(() => {
    loadOvertimes();
  }, [showArchived]);

  const loadOvertimes = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/overtime?showArchived=${showArchived}`);
      if (response.ok) {
        const data = await response.json();
        setOvertimes(data);
      }
    } catch (error) {
      console.error("Error loading overtimes:", error);
    } finally {
      setLoading(false);
    }
  };

  const openApplicationModal = (overtimeId: string, type: "FULL" | "PARTIAL") => {
    const ot = overtimes.find(o => o.id === overtimeId);
    if (!ot) return;
    
    setSelectedOvertime(ot);
    setApplicationType(type);
    setShowApplicationModal(true);
    setError("");
    setComment("");
    setPartialStartTime("");
    setPartialEndTime("");
  };

  const closeApplicationModal = () => {
    setShowApplicationModal(false);
    setSelectedOvertime(null);
    setError("");
    setComment("");
    setPartialStartTime("");
    setPartialEndTime("");
  };

  const submitApplication = async () => {
    if (!selectedOvertime) return;

    setSubmitting(true);
    setError("");

    try {
      const body: any = {
        overtimeId: selectedOvertime.id,
        requestType: applicationType,
        comment: comment || undefined,
      };

      if (applicationType === "PARTIAL") {
        if (!partialStartTime || !partialEndTime) {
          setError("Please specify both start and end times");
          setSubmitting(false);
          return;
        }
        body.requestedStartTime = partialStartTime;
        body.requestedEndTime = partialEndTime;
      }

      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to submit application");
        return;
      }

      // Success - reload overtimes and close modal
      await loadOvertimes();
      closeApplicationModal();
      alert("Application submitted successfully!");
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (applicationId: string) => {
    if (!confirm("Are you sure you want to cancel this application?")) {
      return;
    }

    try {
      const response = await fetch("/api/applications/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          applicationId,
          cancellationReason: "User requested cancellation"
        }),
      });

      if (response.ok) {
        await loadOvertimes();
        alert("Application cancelled successfully");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to cancel application");
      }
    } catch (error) {
      console.error("Error cancelling application:", error);
      alert("Failed to cancel application");
    }
  };

  const handleRequestCancellation = async (reason: string) => {
    if (!selectedApplicationId) return;

    try {
      const response = await fetch("/api/applications/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedApplicationId,
          cancellationReason: reason,
        }),
      });

      if (response.ok) {
        await loadOvertimes();
        setShowCancellationRequestModal(false);
        setSelectedApplicationId(null);
        setSelectedCancellationOvertime(null);
        alert("Cancellation request submitted successfully");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to request cancellation");
      }
    } catch (error) {
      console.error("Error requesting cancellation:", error);
      alert("Failed to request cancellation");
    }
  };

  const getFilteredOvertimes = () => {
    return overtimes.filter((ot) => {
      const app = ot.userApplication;
      
      // Available overtime (no application or rejected/cancelled/withdrawn)
      const isAvailable = !app || app.status === "REJECTED_MANUAL" || app.status === "REJECTED_CAPACITY" || app.status === "CANCELLED" || app.status === "WITHDRAWN";
      
      // My approved
      const isMyApproved = app?.status === "APPROVED";
      
      // My pending
      const isMyPending = app?.status === "PENDING_APPROVAL";
      
      // Cancellation pending
      const isCancellationPending = app?.status === "CANCEL_PENDING";
      
      // Apply filters
      if (showAvailable && isAvailable) return true;
      if (showMyApproved && isMyApproved) return true;
      if (showMyPending && isMyPending) return true;
      if (showCancellationPending && isCancellationPending) return true;
      
      return false;
    });
  };

  const getStatusBadge = (ot: Overtime) => {
    const app = ot.userApplication;
    
    if (!app) {
      return <span className="px-2 py-1 bg-green-600 text-white text-xs rounded">Available</span>;
    }
    
    switch (app.status) {
      case "PENDING_APPROVAL":
        return <span className="px-2 py-1 bg-yellow-600 text-white text-xs rounded">Pending Approval</span>;
      case "APPROVED":
        return <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Approved</span>;
      case "CANCEL_PENDING":
        return <span className="px-2 py-1 bg-orange-600 text-white text-xs rounded">Cancellation Pending</span>;
      case "REJECTED_MANUAL":
      case "REJECTED_CAPACITY":
        return <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">Rejected</span>;
      case "CANCELLED":
        return <span className="px-2 py-1 bg-gray-600 text-white text-xs rounded">Cancelled</span>;
      case "WITHDRAWN":
        return <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded">Withdrawn</span>;
      default:
        return null;
    }
  };

  const filteredOvertimes = getFilteredOvertimes();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8 text-white text-center">
          Loading overtime...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-6">Overtime Dashboard</h1>

        {/* Filters */}
        <div className="mb-6">
          <FilterDropdown
            showAvailable={showAvailable}
            showMyApproved={showMyApproved}
            showMyPending={showMyPending}
            showCancellationPending={showCancellationPending}
            showArchived={showArchived}
            onFilterChange={(filters) => {
              setShowAvailable(filters.showAvailable);
              setShowMyApproved(filters.showMyApproved);
              setShowMyPending(filters.showMyPending);
              setShowCancellationPending(filters.showCancellationPending);
              setShowArchived(filters.showArchived);
            }}
          />
        </div>

        {/* Overtime Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOvertimes.length === 0 ? (
            <div className="col-span-full text-white text-center py-8">
              No overtime records match your current filters.
            </div>
          ) : (
            filteredOvertimes.map((ot) => {
              const bgColor = ot.areaShiftColour?.shiftColour.hexColor || ot.shiftColour?.hexColor || "#4B5563";
              const lightBgColor = lightenColor(bgColor, 20);
              const textColor = getTextColor(bgColor);
              
              return (
                <div
                  key={ot.id}
                  onClick={() => router.push(`/overtime/${ot.id}`)}
                  className="cursor-pointer rounded-2xl p-6 border-2 shadow-2xl transform transition-all duration-300 hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${bgColor} 0%, ${lightBgColor} 100%)`,
                    borderColor: bgColor,
                  }}
                >
                  {/* SHIFT COLOUR NAME - Large Bold Text at Top */}
                  <div className={`font-bold text-2xl mb-3 ${textColor} uppercase`}>
                    {ot.areaShiftColour?.shiftColour.name || ot.shiftColour?.name}
                  </div>

                  {/* Full Date Format */}
                  <div className={`font-semibold text-lg mb-2 ${textColor}`}>
                    {new Date(ot.date).toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric"
                    })}
                  </div>

                  {/* Area Name */}
                  <div className={`mb-2 ${textColor} opacity-90 font-semibold`}>
                    {ot.areaShiftColour?.area.name || ot.area?.name}
                  </div>

                  {/* Time Range */}
                  <div className={`text-sm mb-3 ${textColor} opacity-80`}>
                    {ot.startTime} – {ot.endTime}
                  </div>

                  {/* Slots */}
                  <div className={`text-sm mb-3 ${textColor} opacity-90 font-semibold`}>
                    Slots: {ot.approvedCount}/{ot.requiredPeople}
                    {ot.approvedCount >= ot.requiredPeople && " (FULL)"}
                  </div>

                  {/* Visual Slot Blocks */}
                  <div className="mb-3 flex gap-2">
                    {Array.from({ length: ot.requiredPeople }).map((_, index) => (
                      <div
                        key={index}
                        className={`flex-1 min-w-[80px] px-2 py-2 rounded border-2 ${textColor} text-xs text-center font-semibold ${
                          index < ot.acceptedWorkers.length
                            ? 'bg-white bg-opacity-30 border-white border-opacity-50'
                            : 'bg-transparent border-white border-opacity-30 border-dashed'
                        }`}
                      >
                        {index < ot.acceptedWorkers.length ? ot.acceptedWorkers[index].name : 'Empty'}
                      </div>
                    ))}
                  </div>

                  {/* Accepted Users */}
                  <div className={`mb-3 ${textColor}`}>
                    <div className={`text-sm mb-1 ${textColor} opacity-90 font-semibold`}>Accepted:</div>
                    {ot.acceptedWorkers && ot.acceptedWorkers.length > 0 ? (
                      <div className={`text-sm flex flex-wrap gap-1 ${textColor}`}>
                        {ot.acceptedWorkers.map((worker, idx) => (
                          <span key={idx} className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                            {worker.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className={`text-sm ${textColor} opacity-75 italic`}>None yet</div>
                    )}
                  </div>

                  {ot.userApplication?.assignedManager && (
                    <div className={`mb-3 ${textColor}`}>
                      <div className={`text-xs ${textColor} opacity-90`}>
                        Waiting with: {ot.userApplication.assignedManager.name}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Section */}
                  <div className="mt-4 pt-3 border-t border-white border-opacity-30" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const app = ot.userApplication;
                      const applicationStatus = app?.status;
                      const userApplication = app;
                      const isFull = ot.approvedCount >= ot.requiredPeople;

                      if (applicationStatus === "PENDING_APPROVAL" && userApplication) {
                        return (
                          <div className="space-y-2">
                            <div className="w-full py-2 px-3 rounded-lg bg-yellow-600 text-white font-semibold text-center text-sm">
                              ⏳ Pending Approval
                            </div>
                            {userApplication.assignedManager && (
                              <div className={`text-xs ${textColor} bg-white bg-opacity-20 rounded-lg p-2 text-center`}>
                                <span className="font-semibold">Waiting with: {userApplication.assignedManager.name}</span>
                              </div>
                            )}
                            <button
                              onClick={() => handleCancelRequest(userApplication.id)}
                              className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors text-sm"
                            >
                              Cancel Request
                            </button>
                          </div>
                        );
                      } else if (applicationStatus === "APPROVED" && userApplication) {
                        return (
                          <div className="space-y-2">
                            <div className="w-full py-2 px-3 rounded-lg bg-green-600 text-white font-semibold text-center text-sm">
                              ✓ Approved
                            </div>
                            <button
                              onClick={() => {
                                setSelectedApplicationId(userApplication.id);
                                setSelectedCancellationOvertime(ot);
                                setShowCancellationRequestModal(true);
                              }}
                              className="w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold transition-colors text-sm"
                            >
                              Request Cancellation
                            </button>
                          </div>
                        );
                      } else if (applicationStatus === "CANCEL_PENDING") {
                        return (
                          <div className="space-y-2">
                            <div className="w-full py-2 px-3 rounded-lg bg-orange-500 text-white font-semibold text-center text-sm">
                              ⚠️ Cancellation Pending
                            </div>
                            {userApplication && userApplication.assignedManager && (
                              <div className={`text-xs ${textColor} bg-white bg-opacity-20 rounded-lg p-2 text-center`}>
                                <span className="font-semibold">Waiting with: {userApplication.assignedManager.name}</span>
                              </div>
                            )}
                            {userApplication && userApplication.cancellationRequestedReason && (
                              <div className={`text-xs ${textColor} bg-white bg-opacity-20 rounded-lg p-2`}>
                                <div className="font-semibold mb-1">Cancellation Request:</div>
                                <div className="mb-1"><strong>Reason:</strong> {userApplication.cancellationRequestedReason}</div>
                                {userApplication.cancellationRequestedAt && (
                                  <div><strong>Requested:</strong> {new Date(userApplication.cancellationRequestedAt).toLocaleString()}</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      } else if (applicationStatus === "REJECTED_MANUAL" || applicationStatus === "REJECTED_CAPACITY") {
                        return (
                          <div className="space-y-2">
                            <div className="w-full py-2 px-3 rounded-lg bg-red-500 text-white font-semibold text-center text-sm">
                              ✗ Rejected
                            </div>
                            {!isFull && (
                              <div className="space-y-2">
                                <button
                                  onClick={() => openApplicationModal(ot.id, "FULL")}
                                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors text-sm"
                                >
                                  Apply Again (Full Shift)
                                </button>
                                <button
                                  onClick={() => openApplicationModal(ot.id, "PARTIAL")}
                                  className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors text-sm"
                                >
                                  Apply Again (Different Hours)
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      } else if (applicationStatus === "CANCELLED") {
                        return (
                          <div className="space-y-2">
                            <div className="w-full py-2 px-3 rounded-lg bg-gray-500 text-white font-semibold text-center text-sm">
                              ✗ Cancelled
                            </div>
                            {!isFull && (
                              <div className="space-y-2">
                                <button
                                  onClick={() => openApplicationModal(ot.id, "FULL")}
                                  className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors text-sm"
                                >
                                  Apply Again (Full Shift)
                                </button>
                                <button
                                  onClick={() => openApplicationModal(ot.id, "PARTIAL")}
                                  className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors text-sm"
                                >
                                  Apply Again (Different Hours)
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      } else if (applicationStatus === "WITHDRAWN") {
                        // WITHDRAWN applications should show normal apply buttons (not "Apply Again")
                        return !isFull ? (
                          <div className="space-y-2">
                            <button
                              onClick={() => openApplicationModal(ot.id, "FULL")}
                              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors text-sm"
                            >
                              ✓ Apply for Full Shift
                            </button>
                            <button
                              onClick={() => openApplicationModal(ot.id, "PARTIAL")}
                              className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-colors text-sm"
                            >
                              ⏱ Apply with Different Hours
                            </button>
                          </div>
                        ) : (
                          <div className="w-full py-2 px-3 rounded-lg bg-gray-500 text-white font-semibold text-center text-sm">
                            Fully Staffed
                          </div>
                        );
                      } else if (isFull) {
                        return (
                          <div className="w-full py-2 px-3 rounded-lg bg-gray-500 text-white font-semibold text-center text-sm">
                            Fully Staffed
                          </div>
                        );
                      } else {
                        return (
                          <div className="space-y-2">
                            <button
                              onClick={() => openApplicationModal(ot.id, "FULL")}
                              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all duration-200 shadow-lg text-sm"
                            >
                              ✓ Apply for Full Shift
                            </button>
                            <button
                              onClick={() => openApplicationModal(ot.id, "PARTIAL")}
                              className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold transition-all duration-200 shadow-lg text-sm"
                            >
                              ⏱ Apply with Different Hours
                            </button>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>

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
        <CancellationRequestModal
          isOpen={showCancellationRequestModal}
          onClose={() => {
            setShowCancellationRequestModal(false);
            setSelectedApplicationId(null);
            setSelectedCancellationOvertime(null);
          }}
          onSubmit={handleRequestCancellation}
          applicationId={selectedApplicationId || ""}
          overtimeDetails={
            selectedCancellationOvertime
              ? {
                  date: new Date(selectedCancellationOvertime.date).toDateString(),
                  area: selectedCancellationOvertime.area.name,
                  shiftColour: selectedCancellationOvertime.shiftColour.name,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
