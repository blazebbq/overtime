"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";

type ShiftDayType = "DDE" | "DDL" | "TWELVE_N" | "EIGHT_N" | "TWELVE_D" | "D" | "OFF";

type DailyPattern = {
  date: string;
  dayType: ShiftDayType | null;
};

const SHIFT_TYPES: { value: ShiftDayType; label: string }[] = [
  { value: "DDE", label: "DDE" },
  { value: "DDL", label: "DDL" },
  { value: "TWELVE_N", label: "12N" },
  { value: "EIGHT_N", label: "8N" },
  { value: "TWELVE_D", label: "12D" },
  { value: "D", label: "D" },
  { value: "OFF", label: "OFF" },
];

export default function ShiftPatternEditor() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dailyPatterns, setDailyPatterns] = useState<DailyPattern[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(currentMonth);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      initializeDaysForMonth(selectedMonth);
    }
  }, [selectedMonth]);

  const initializeDaysForMonth = async (month: string) => {
    const [year, monthNum] = month.split("-").map(Number);
    
    try {
      const response = await fetch(`/api/shift-patterns/forecast?month=${month}`);
      if (response.ok) {
        const data = await response.json();
        const patterns: DailyPattern[] = data.forecast.map((day: any) => ({
          date: day.date,
          dayType: day.dayType,
        }));
        setDailyPatterns(patterns);
      }
    } catch (error) {
      console.error("Error loading forecast:", error);
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      const patterns: DailyPattern[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, monthNum - 1, day);
        const dateStr = date.toISOString().split("T")[0];
        patterns.push({ date: dateStr, dayType: null });
      }
      setDailyPatterns(patterns);
    }
  };

  const handleDayTypeChange = (index: number, dayType: ShiftDayType | null) => {
    const updated = [...dailyPatterns];
    updated[index].dayType = dayType;
    setDailyPatterns(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/shift-patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyPatterns }),
      });

      if (response.ok) {
        alert("Shift pattern saved successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Failed to save"}`);
      }
    } catch (error) {
      console.error("Error saving pattern:", error);
      alert("Failed to save shift pattern");
    } finally {
      setSaving(false);
    }
  };

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8 text-white text-center">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Shift Pattern Editor</h1>
          <button
            onClick={() => router.push("/shift-patterns/forecast")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View Forecast Calendar
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <label className="text-white font-medium">Select Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {dailyPatterns.map((pattern, index) => (
              <div
                key={pattern.date}
                className="bg-gray-700 rounded-lg p-4 border border-gray-600"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-white font-medium">{formatDate(pattern.date)}</div>
                    <div className="text-gray-400 text-sm">{getDayOfWeek(pattern.date)}</div>
                  </div>
                </div>
                <select
                  value={pattern.dayType || ""}
                  onChange={(e) =>
                    handleDayTypeChange(
                      index,
                      e.target.value ? (e.target.value as ShiftDayType) : null
                    )
                  }
                  className="w-full mt-2 px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Select Shift --</option>
                  {SHIFT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Pattern"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
