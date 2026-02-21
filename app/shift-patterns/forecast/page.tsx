"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/app/components/Header";

type ForecastDay = {
  date: string;
  dayType: string | null;
};

const SHIFT_LABELS: Record<string, string> = {
  DDE: "DDE",
  DDL: "DDL",
  TWELVE_N: "12N",
  EIGHT_N: "8N",
  TWELVE_D: "12D",
  D: "D",
  OFF: "OFF",
};

const SHIFT_COLORS: Record<string, string> = {
  DDE: "bg-purple-600",
  DDL: "bg-indigo-600",
  TWELVE_N: "bg-blue-600",
  EIGHT_N: "bg-cyan-600",
  TWELVE_D: "bg-teal-600",
  D: "bg-green-600",
  OFF: "bg-gray-600",
};

export default function ForecastCalendar() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [currentMonthName, setCurrentMonthName] = useState("");

  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(currentMonth);
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      loadForecast(selectedMonth);
    }
  }, [selectedMonth]);

  const loadForecast = async (month: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shift-patterns/forecast?month=${month}`);
      if (response.ok) {
        const data = await response.json();
        setForecast(data.forecast);
        
        // Set month name
        const [year, monthNum] = month.split("-");
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        setCurrentMonthName(date.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
      }
    } catch (error) {
      console.error("Error loading forecast:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const newDate = new Date(year, month - 1 + direction);
    const newMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonth(newMonth);
  };

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  const getDayNumber = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getDate();
  };

  // Group forecast by weeks
  const getWeeks = () => {
    const weeks: ForecastDay[][] = [];
    let currentWeek: ForecastDay[] = [];
    
    // Add empty days for the first week to align with day of week
    if (forecast.length > 0) {
      const firstDate = new Date(forecast[0].date);
      const firstDayOfWeek = firstDate.getDay(); // 0 = Sunday
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({ date: "", dayType: null });
      }
    }

    forecast.forEach((day, index) => {
      currentWeek.push(day);
      
      const date = new Date(day.date);
      const dayOfWeek = date.getDay();
      
      // Saturday (6) ends the week
      if (dayOfWeek === 6 || index === forecast.length - 1) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });

    return weeks;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="container mx-auto px-4 py-8 text-white text-center">
          Loading forecast...
        </div>
      </div>
    );
  }

  const weeks = getWeeks();

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Shift Forecast Calendar</h1>
          <button
            onClick={() => router.push("/shift-patterns")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit Shift Pattern
          </button>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigateMonth(-1)}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Previous Month
            </button>
            <h2 className="text-2xl font-bold text-white">{currentMonthName}</h2>
            <button
              onClick={() => navigateMonth(1)}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            >
              Next Month
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            {/* Week Day Headers */}
            <div className="grid grid-cols-7 bg-gray-700">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="p-3 text-center font-bold text-white border-r border-gray-600 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 border-t border-gray-700">
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className="min-h-[100px] p-2 border-r border-gray-700 last:border-r-0"
                  >
                    {day.date && (
                      <div className="h-full">
                        <div className="text-white font-bold mb-1">{getDayNumber(day.date)}</div>
                        {day.dayType && (
                          <div className={`${SHIFT_COLORS[day.dayType] || "bg-gray-600"} text-white text-center py-1 px-2 rounded text-sm font-medium`}>
                            {SHIFT_LABELS[day.dayType] || day.dayType}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap gap-3">
            <div className="text-white font-medium">Legend:</div>
            {Object.entries(SHIFT_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={`${SHIFT_COLORS[key]} w-6 h-6 rounded`}></div>
                <span className="text-white text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
