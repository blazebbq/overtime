"use client";

import { useEffect, useState } from "react";
import { UserIcon } from "@heroicons/react/24/solid";

type Booking = {
  id: string;
  user?: { name: string };
};

type Overtime = {
  id: string;
  date: string;
  shift: string;
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
  const [data, setData] = useState<Overtime[]>([]);

  const load = async () => {
    const res = await fetch("/api/overtime");
    const json = await res.json();
    setData(json);
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
    <main className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-center">Overtime</h1>

      {data.map((ot) => {
        const booked = ot.bookings.length;
        const isFull = booked >= ot.requiredPeople;

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

            {/* TIME (static for now) */}
            <div className="text-sm text-zinc-300 mb-3">
              Time: 07:00 – 19:00
            </div>

            {/* SILHOUETTES */}
            <div className="flex gap-2 mb-2">
              {Array.from({ length: ot.requiredPeople }).map((_, i) => {
                const filled = ot.bookings[i];
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-1 text-sm ${
                      filled ? "text-white" : "text-zinc-500"
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
              disabled={isFull}
              onClick={() => toggleBooking(ot.id)}
              className={`w-full py-2 rounded-lg font-semibold transition ${
                isFull
                  ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {isFull ? "Fully Booked" : "Book / Cancel"}
            </button>
          </div>
        );
      })}
    </main>
  );
}
