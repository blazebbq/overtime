"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";

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
  acceptedWorkers: string[];
  userApplication?: {
    id: string;
    status: string;
    assignedManager?: { name: string };
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
  const [showCancellationPending, setShowCancellationPending] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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

  const getFilteredOvertimes = () => {
    return overtimes.filter((ot) => {
      const app = ot.userApplication;
      
      // Available overtime (no application or rejected/cancelled)
      const isAvailable = !app || app.status === "REJECTED_MANUAL" || app.status === "REJECTED_CAPACITY" || app.status === "CANCELLED";
      
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
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="text-white font-medium mb-3">Filters:</div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={showAvailable}
                onChange={(e) => setShowAvailable(e.target.checked)}
                className="w-4 h-4"
              />
              Show Available
            </label>
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={showMyApproved}
                onChange={(e) => setShowMyApproved(e.target.checked)}
                className="w-4 h-4"
              />
              Show My Approved
            </label>
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={showMyPending}
                onChange={(e) => setShowMyPending(e.target.checked)}
                className="w-4 h-4"
              />
              Show My Pending
            </label>
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={showCancellationPending}
                onChange={(e) => setShowCancellationPending(e.target.checked)}
                className="w-4 h-4"
              />
              Show Cancellation Pending
            </label>
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="w-4 h-4"
              />
              Show Archived
            </label>
          </div>
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
                  <div className="flex justify-between items-start mb-2">
                    <div className={`font-bold text-lg ${textColor}`}>
                      {new Date(ot.date).toLocaleDateString()}
                    </div>
                    {getStatusBadge(ot)}
                  </div>

                  <div className={`mb-2 ${textColor} opacity-90`}>
                    {ot.areaShiftColour?.area.name || ot.area?.name} - {ot.areaShiftColour?.shiftColour.name || ot.shiftColour?.name}
                  </div>

                  <div className={`text-sm mb-2 ${textColor} opacity-80`}>
                    {ot.startTime} - {ot.endTime}
                  </div>

                  <div className={`text-sm mb-2 ${textColor} opacity-90 font-semibold`}>
                    Slots: {ot.approvedCount}/{ot.requiredPeople}
                    {ot.approvedCount >= ot.requiredPeople && " (FULL)"}
                  </div>

                  {ot.acceptedWorkers && ot.acceptedWorkers.length > 0 && (
                    <div className={`mt-2 pt-2 border-t ${textColor} opacity-30`}>
                      <div className={`text-xs mb-1 ${textColor} opacity-90 font-semibold`}>Accepted:</div>
                      <div className={`text-sm flex flex-wrap gap-1 ${textColor}`}>
                        {ot.acceptedWorkers.map((worker, idx) => (
                          <span key={idx} className="bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                            {worker}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {ot.userApplication?.assignedManager && (
                    <div className={`mt-2 pt-2 border-t ${textColor} opacity-30`}>
                      <div className={`text-xs ${textColor} opacity-90`}>
                        Waiting with: {ot.userApplication.assignedManager.name}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
