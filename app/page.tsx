"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserIcon } from "@heroicons/react/24/solid";
import Header from "./components/Header";

type Booking = {
  id: string;
  userId: string;
  user?: { name: string };
};

type Area = {
  id: string;
  name: string;
  enabled: boolean;
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
  area: Area;
  shiftColour: ShiftColour;
  bookings: Booking[];
};

// Convert hex color to tailwind-compatible gradient classes
function getShiftStyles(hexColor: string): string {
  return `border-2 shadow-2xl`;
}

function getTextColor(hexColor: string): string {
  const luminance = parseInt(hexColor.slice(1, 3), 16) * 0.299 +
                   parseInt(hexColor.slice(3, 5), 16) * 0.587 +
                   parseInt(hexColor.slice(5, 7), 16) * 0.114;
  return luminance < 128 ? "text-white" : "text-gray-900";
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [myBookingsOnly, setMyBookingsOnly] = useState(false);
  const [data, setData] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(true);
  const [areasLoading, setAreasLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingResponse, setBookingResponse] = useState<{breachWarning?: boolean} | null>(null);

  // Authentication check
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Load areas on mount
  useEffect(() => {
    const loadAreas = async () => {
      setAreasLoading(true);
      try {
        const res = await fetch("/api/areas");
        if (!res.ok) throw new Error("Failed to fetch areas");
        const json = await res.json();
        setAreas(json);
        if (json.length > 0) {
          setSelectedAreaId(json[0].id);
        }
      } catch (err) {
        console.error("Failed to load areas:", err);
        setError("Failed to load areas");
      } finally {
        setAreasLoading(false);
      }
    };

    if (status === "authenticated") {
      loadAreas();
    }
  }, [status]);

  // Load overtime when area or filters change
  const load = useCallback(async () => {
    if (!selectedAreaId) return;
    
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        areaId: selectedAreaId,
        availableOnly: availableOnly.toString(),
        myBookingsOnly: myBookingsOnly.toString(),
      });
      const res = await fetch(`/api/overtime?${params}`);
      if (!res.ok) throw new Error("Failed to fetch overtime");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load overtime:", err);
      setError("Failed to load overtime");
    } finally {
      setLoading(false);
    }
  }, [selectedAreaId, availableOnly, myBookingsOnly]);

  useEffect(() => {
    if (selectedAreaId && status === "authenticated") {
      load();
    }
  }, [selectedAreaId, status, load]);

  const toggleBooking = async (id: string) => {
    try {
      const res = await fetch("/api/overtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overtimeId: id }),
      });
      const json = await res.json();
      setBookingResponse(json);
      
      // Clear breach warning after 5 seconds
      if (json.breachWarning) {
        setTimeout(() => setBookingResponse(null), 5000);
      }
      
      load();
    } catch (err) {
      console.error("Failed to toggle booking:", err);
      setError("Failed to update booking");
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
      <main className="p-4 max-w-4xl mx-auto space-y-6">
        {/* Area Selection */}
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white">Select Area</h2>
          {areasLoading ? (
            <div className="text-center text-zinc-400">Loading areas...</div>
          ) : areas.length === 0 ? (
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

        {/* Filters */}
        {selectedAreaId && (
          <div className="flex flex-wrap gap-4 p-4 bg-zinc-800 rounded-xl border border-zinc-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => setAvailableOnly(e.target.checked)}
                className="w-5 h-5 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
              />
              <span className="text-white font-medium">Show available only</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={myBookingsOnly}
                onChange={(e) => setMyBookingsOnly(e.target.checked)}
                className="w-5 h-5 rounded border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-zinc-800"
              />
              <span className="text-white font-medium">Show my bookings only</span>
            </label>
          </div>
        )}

        {/* Breach Warning */}
        {bookingResponse?.breachWarning && (
          <div className="p-4 bg-yellow-900/50 border-2 border-yellow-500 rounded-xl text-yellow-200">
            <strong>⚠️ Warning:</strong> This booking may result in consecutive working days exceeding the recommended limit.
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-900/50 border-2 border-red-500 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {/* Overtime List */}
        {loading && selectedAreaId && (
          <div className="text-center text-zinc-400">Loading overtime...</div>
        )}

        {!loading && selectedAreaId && data.length === 0 && (
          <div className="text-center text-zinc-400">No overtime available</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((ot) => {
            const booked = ot.bookings.length;
            const isFull = booked >= ot.requiredPeople;
            
            // CRITICAL BUSINESS RULE: User can always cancel their own booking
            const userId = (session?.user as any)?.id;
            const userBooking = ot.bookings.find((b) => b.userId === userId);
            const hasMyBooking = !!userBooking;
            
            // Button is only disabled if shift is FULL AND user doesn't have a booking
            const isButtonDisabled = isFull && !hasMyBooking;

            const bgColor = ot.shiftColour.hexColor;
            const lightBgColor = lightenColor(bgColor, 20);
            const textColor = getTextColor(bgColor);

            return (
              <div
                key={ot.id}
                className={`rounded-2xl p-6 transform transition-all duration-300 hover:scale-105 ${getShiftStyles(bgColor)}`}
                style={{
                  background: `linear-gradient(135deg, ${bgColor} 0%, ${lightBgColor} 100%)`,
                  borderColor: bgColor,
                }}
              >
                {/* SHIFT & AREA */}
                <div className={`text-2xl font-bold mb-1 ${textColor}`}>
                  {ot.shiftColour.name} Shift
                </div>
                <div className={`text-sm mb-3 ${textColor} opacity-80 font-semibold`}>
                  📍 {ot.area.name}
                </div>

                {/* DATE & TIME */}
                <div className={`text-sm mb-4 ${textColor} opacity-90`}>
                  <div className="font-medium">
                    📅 {new Date(ot.date).toDateString()}
                  </div>
                  <div className="font-medium">
                    🕐 {ot.startTime} – {ot.endTime}
                  </div>
                </div>

                {/* SILHOUETTES */}
                <div className="flex flex-wrap gap-2 mb-4 p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  {Array.from({ length: ot.requiredPeople }).map((_, i) => {
                    const filled = ot.bookings[i];
                    const isMe = filled?.userId === userId;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-1 text-sm px-2 py-1 rounded ${
                          isMe
                            ? "bg-blue-500 text-white font-bold"
                            : filled
                            ? "bg-white/30 text-gray-900 font-semibold"
                            : "bg-white/10 text-gray-700"
                        }`}
                      >
                        <UserIcon className="w-4 h-4" />
                        <span className="text-xs">{filled?.user?.name ?? "Open"}</span>
                      </div>
                    );
                  })}
                </div>

                {/* STATUS */}
                <div className={`text-sm mb-4 font-semibold ${textColor}`}>
                  {booked}/{ot.requiredPeople}{" "}
                  {isFull ? (
                    <span className="px-2 py-1 bg-green-600 text-white rounded-full text-xs">✓ FULL</span>
                  ) : (
                    <span className="px-2 py-1 bg-red-500 text-white rounded-full text-xs">⚠ {ot.requiredPeople - booked} NEEDED</span>
                  )}
                </div>

                {/* ACTION */}
                <button
                  disabled={isButtonDisabled}
                  onClick={() => toggleBooking(ot.id)}
                  className={`w-full py-3 rounded-xl font-bold transition-all duration-200 ${
                    isButtonDisabled
                      ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                      : hasMyBooking
                      ? "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/50"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/50"
                  }`}
                >
                  {hasMyBooking
                    ? "✗ Cancel My Booking"
                    : isFull
                    ? "Fully Booked"
                    : "✓ Book This Shift"}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
