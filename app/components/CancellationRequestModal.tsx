"use client";

import { useState } from "react";

interface CancellationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
  applicationId: string;
  overtimeDetails?: {
    date: string;
    area: string;
    shiftColour: string;
  };
}

export default function CancellationRequestModal({
  isOpen,
  onClose,
  onSubmit,
  applicationId,
  overtimeDetails,
}: CancellationRequestModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("Please provide a reason for cancellation");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(reason);
      setReason("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit cancellation request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setReason("");
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          Request Cancellation
        </h2>

        {overtimeDetails && (
          <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">Date:</span> {overtimeDetails.date}
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-semibold">Area:</span> {overtimeDetails.area}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Shift:</span> {overtimeDetails.shiftColour}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Cancellation *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              rows={4}
              placeholder="Please provide a reason for requesting cancellation..."
              disabled={submitting}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This cancellation requires manager approval
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
