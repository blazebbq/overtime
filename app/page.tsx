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
  Yellow: "shadow-yellow-400/60 border-yellow-400",
  Orange: "shadow-orange-400/60 border-orange-400",
  Purple: "shadow-purple-500/60 border-purple-500",
  Green: "shadow-green-500/60 border-green-500",
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
            className={`rounded-xl border-2 p-4 bg-zinc-900 text-white shadow-lg ${
              shiftStyles[ot.shift] ?? "border-zinc-600"
            }`}
          >
            {/* SHIFT */}
            <div className="text-lg font-semibold mb-1">
              {ot.shift} Shift
            </div>

            {/* DATE */}
            <div className="text-sm text-zinc-300">
              Date: {new Date(ot.date).toDateString()}
            </div>

            {/* TIME */}
            <div className="text-sm text-zinc-300 mb-3">
              Time: {ot.startTime} – {ot.endTime}
            </div>

            {/* SILHOUETTES */}
            <div className="flex gap-2 mb-2">
              {Array.from({ length: ot.requiredPeople }).map((_, i) => {
                const filled = ot.bookings[i];
                const isMe = filled?.userId === userId;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-1 text-sm ${
                      isMe
                        ? "text-blue-400 font-semibold"
                        : filled
                        ? "text-white"
                        : "text-zinc-500"
                    }`}
                  >
                    <UserIcon className="w-5 h-5" />
                    {filled?.user?.name ?? ""}
                  </div>
                );
              })}
            </div>

            {/* STATUS */}
            <div className="text-sm mb-3">
              {booked}/{ot.requiredPeople}{" "}
              {isFull ? (
                <span className="text-green-400 font-semibold">FULL</span>
              ) : (
                <span className="text-red-400">needed</span>
              )}
            </div>

            {/* ACTION */}
            <button
              disabled={isButtonDisabled}
              onClick={() => toggleBooking(ot.id)}
              className={`w-full py-2 rounded-lg font-semibold transition ${
                isButtonDisabled
                  ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  : hasMyBooking
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {hasMyBooking
                ? "Cancel My Booking"
                : isFull
                ? "Fully Booked"
                : "Book Shift"}
            </button>
          </div>
        );
      })}
      </main>
    </>
  );
}
