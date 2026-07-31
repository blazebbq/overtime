"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

type FilterDropdownProps = {
  showAvailable: boolean;
  showMyApproved: boolean;
  showMyPending: boolean;
  showCancellationPending: boolean;
  showArchived: boolean;
  onFilterChange: (filters: {
    showAvailable: boolean;
    showMyApproved: boolean;
    showMyPending: boolean;
    showCancellationPending: boolean;
    showArchived: boolean;
  }) => void;
  areas?: { id: string; name: string }[];
  selectedAreaIds?: string[];
  onAreaChange?: (areaIds: string[]) => void;
};

export default function FilterDropdown({
  showAvailable,
  showMyApproved,
  showMyPending,
  showCancellationPending,
  showArchived,
  onFilterChange,
  areas = [],
  selectedAreaIds = [],
  onAreaChange,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterChange = (filterName: string, value: boolean) => {
    const newFilters = {
      showAvailable,
      showMyApproved,
      showMyPending,
      showCancellationPending,
      showArchived,
      [filterName]: value,
    };
    onFilterChange(newFilters);
  };

  const handleAreaToggle = (areaId: string) => {
    if (!onAreaChange) return;
    
    const newSelectedAreas = selectedAreaIds.includes(areaId)
      ? selectedAreaIds.filter(id => id !== areaId)
      : [...selectedAreaIds, areaId];
    
    onAreaChange(newSelectedAreas);
  };

  const activeFiltersCount = [
    showAvailable,
    showMyApproved,
    showMyPending,
    showCancellationPending,
    showArchived,
  ].filter(Boolean).length + selectedAreaIds.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
      >
        Filters
        {activeFiltersCount > 0 && (
          <span className="bg-white text-blue-600 rounded-full px-2 py-0.5 text-xs font-bold">
            {activeFiltersCount}
          </span>
        )}
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4">
            {/* Status Filters */}
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">Status Filters</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={showAvailable}
                    onChange={(e) => handleFilterChange("showAvailable", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Available</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={showMyApproved}
                    onChange={(e) => handleFilterChange("showMyApproved", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">My Approved</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={showMyPending}
                    onChange={(e) => handleFilterChange("showMyPending", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">My Pending</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={showCancellationPending}
                    onChange={(e) => handleFilterChange("showCancellationPending", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Cancellation Pending</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => handleFilterChange("showArchived", e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Archived</span>
                </label>
              </div>
            </div>

            {/* Area Filters */}
            {areas.length > 0 && onAreaChange && (
              <>
                <div className="border-t border-gray-200 my-4"></div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Areas</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {areas.map((area) => (
                      <label
                        key={area.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedAreaIds.includes(area.id)}
                          onChange={() => handleAreaToggle(area.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">{area.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-3 bg-gray-50 rounded-b-lg">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
