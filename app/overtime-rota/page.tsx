"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface RotaEntry {
  id: string;
  date: string;
  dateObj: string;
  area: string;
  shift: string;
  shiftColor: string;
  time: string;
  assignedWorkers: string;
  requiredPeople: number;
  approvedCount: number;
}

interface RotaData {
  month: number;
  year: number;
  monthName: string;
  data: RotaEntry[];
}

export default function OvertimeRotaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [rotaData, setRotaData] = useState<RotaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchRotaData();
  }, [month, year]);

  const fetchRotaData = async () => {
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(
        `/api/overtime/rota?month=${month}&year=${year}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch rota data");
      }
      
      const data = await response.json();
      setRotaData(data);
    } catch (err) {
      setError("Failed to load rota data. Please try again.");
      console.error("Error fetching rota:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    window.open(
      `/api/overtime/rota/pdf?month=${month}&year=${year}`,
      "_blank"
    );
  };

  const handlePrint = () => {
    window.print();
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 print:shadow-none">
          <div className="print:hidden mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Overtime Rota
            </h1>

            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Month
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleDateString("en-GB", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 1 + i).map(
                    (y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Download PDF
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Print
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Loading rota...</p>
            </div>
          ) : rotaData && rotaData.data.length > 0 ? (
            <>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 print:mt-0">
                Overtime Rota – {rotaData.monthName} {rotaData.year}
              </h2>

              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
                        Date
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
                        Area
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
                        Shift
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
                        Time
                      </th>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-900">
                        Assigned Workers
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rotaData.data.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                          {entry.date}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                          {entry.area}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm">
                          <span
                            className="inline-block px-2 py-1 rounded text-white font-medium"
                            style={{ backgroundColor: entry.shiftColor }}
                          >
                            {entry.shift}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                          {entry.time}
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                          {entry.assignedWorkers || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">
                No overtime scheduled for {rotaData?.monthName} {rotaData?.year}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
