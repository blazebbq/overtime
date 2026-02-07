"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { UserIcon } from "@heroicons/react/24/solid";
import Header from "./components/Header";

type Booking = {
  id: string;
  userId: string;
  user?: { name: string };
};

type Overtime = {
  id: string;
  date: string;
  shift: string;
  startTime: string;
  endTime: string;
  requiredPeople: number;
  bookings: Booking[];
};

const shiftStyles: Record<string, string> = {
  YELLOW: "bg-gradient-to-br from-yellow-400 to-amber-500 border-yellow-300 shadow-yellow-500/50",
  ORANGE: "bg-gradient-to-br from-orange-400 to-red-500 border-orange-300 shadow-orange-500/50",
  PURPLE: "bg-gradient-to-br from-purple-400 to-indigo-600 border-purple-300 shadow-purple-500/50",
  GREEN: "bg-gradient-to-br from-green-400 to-emerald-600 border-green-300 shadow-green-500/50",
};

const shiftTextStyles: Record<string, string> = {
  YELLOW: "text-yellow-900",
  ORANGE: "text-orange-900",
  PURPLE: "text-purple-900",
  GREEN: "text-green-900",
};

export default function Home() {
  const { data: session } = useSession();
  const [data, setData] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/overtime");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load overtime:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleBooking = async (id: string) => {
    await fetch("/api/overtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ overtimeId: id }),
    });
    load();
  };

  return (
    <>
      <Header />
      <main className="p-4 max-w-md mx-auto space-y-4">
        {loading && (
          <div className="text-center text-zinc-400">Loading...</div>
        )}

        {!loading && data.length === 0 && (
          <div className="text-center text-zinc-400">No overtime available</div>
        )}

      {data.map((ot) => {
        const booked = ot.bookings.length;
        const isFull = booked >= ot.requiredPeople;
        
        // CRITICAL BUSINESS RULE: User can always cancel their own booking
        const userId = (session?.user as any)?.id;
        const userBooking = ot.bookings.find((b) => b.userId === userId);
        const hasMyBooking = !!userBooking;
        
        // Button is only disabled if shift is FULL AND user doesn't have a booking
        const isButtonDisabled = isFull && !hasMyBooking;

        return (
          <div
            key={ot.id}
            className={`rounded-2xl border-2 p-6 shadow-2xl transform transition-all duration-300 hover:scale-105 ${
              shiftStyles[ot.shift] ?? "bg-zinc-900 border-zinc-600 shadow-lg"
            }`}
          >
            {/* SHIFT */}
            <div className={`text-2xl font-bold mb-2 ${shiftTextStyles[ot.shift] ?? "text-white"}`}>
              {ot.shift} Shift
            </div>

            {/* DATE & TIME */}
            <div className={`text-sm mb-4 ${shiftTextStyles[ot.shift] ?? "text-zinc-300"} opacity-90`}>
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
            <div className={`text-sm mb-4 font-semibold ${shiftTextStyles[ot.shift] ?? "text-white"}`}>
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
      </main>
    </>
  );
}
