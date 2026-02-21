"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";

type InboxItemType = "APPLICATION_REQUEST" | "CANCELLATION_REQUEST";
type InboxItemStatus = "UNREAD" | "OPEN" | "RESOLVED";

interface InboxItem {
  id: string;
  type: InboxItemType;
  status: InboxItemStatus;
  createdAt: string;
  resolvedAt: string | null;
  cancellationRequestedReason: string | null;
  requester: {
    id: string;
    name: string | null;
    email: string;
  };
  overtimePost: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    area: {
      name: string;
      colour: string;
    };
    shiftColour: {
      name: string;
      colour: string;
    };
  };
  applicationId: string;
}

export default function InboxPage() {
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InboxItemStatus | "ALL">("ALL");

  useEffect(() => {
    loadInboxItems();
  }, [filter]);

  const loadInboxItems = async () => {
    try {
      setLoading(true);
      const url =
        filter === "ALL"
          ? "/api/inbox"
          : `/api/inbox?status=${filter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to load inbox items:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsOpen = async (itemId: string) => {
    try {
      await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, status: "OPEN" }),
      });
      loadInboxItems();
    } catch (error) {
      console.error("Failed to mark as open:", error);
    }
  };

  const handleItemClick = (item: InboxItem) => {
    // Mark as open if unread
    if (item.status === "UNREAD") {
      markAsOpen(item.id);
    }
    // Navigate to overtime details
    router.push(`/overtime/${item.overtimePost.id}`);
  };

  const handleApproveCancellation = async (
    e: React.MouseEvent,
    applicationId: string
  ) => {
    e.stopPropagation(); // Prevent card click
    if (!confirm("Approve this cancellation request?")) return;

    try {
      const response = await fetch("/api/manager/cancellation-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          action: "APPROVE",
        }),
      });

      if (response.ok) {
        alert("Cancellation approved successfully");
        loadInboxItems();
      } else {
        const data = await response.json();
        alert(`Failed to approve: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to approve cancellation:", error);
      alert("Failed to approve cancellation");
    }
  };

  const handleRejectCancellation = async (
    e: React.MouseEvent,
    applicationId: string
  ) => {
    e.stopPropagation(); // Prevent card click
    if (!confirm("Reject this cancellation request? The user will remain assigned to the overtime.")) return;

    try {
      const response = await fetch("/api/manager/cancellation-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          action: "REJECT",
        }),
      });

      if (response.ok) {
        alert("Cancellation rejected successfully");
        loadInboxItems();
      } else {
        const data = await response.json();
        alert(`Failed to reject: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to reject cancellation:", error);
      alert("Failed to reject cancellation");
    }
  };

  const getTypeLabel = (type: InboxItemType) => {
    return type === "APPLICATION_REQUEST"
      ? "New Application"
      : "Cancellation Request";
  };

  const getStatusBadge = (status: InboxItemStatus) => {
    const styles = {
      UNREAD: "bg-blue-500 text-white",
      OPEN: "bg-yellow-500 text-white",
      RESOLVED: "bg-green-500 text-white",
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold ${styles[status]}`}
      >
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: InboxItemType) => {
    const styles = {
      APPLICATION_REQUEST: "bg-purple-500 text-white",
      CANCELLATION_REQUEST: "bg-orange-500 text-white",
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-semibold ${styles[type]}`}
      >
        {getTypeLabel(type)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const unreadCount = items.filter((item) => item.status === "UNREAD").length;
  const openCount = items.filter((item) => item.status === "OPEN").length;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Manager Inbox</h1>
            <p className="text-gray-600">
              Review and manage overtime applications and cancellation requests
            </p>
          </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setFilter("ALL")}
              className={`flex-1 px-4 py-3 font-medium ${
                filter === "ALL"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setFilter("UNREAD")}
              className={`flex-1 px-4 py-3 font-medium ${
                filter === "UNREAD"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setFilter("OPEN")}
              className={`flex-1 px-4 py-3 font-medium ${
                filter === "OPEN"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Open ({openCount})
            </button>
            <button
              onClick={() => setFilter("RESOLVED")}
              className={`flex-1 px-4 py-3 font-medium ${
                filter === "RESOLVED"
                  ? "border-b-2 border-blue-500 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Resolved
            </button>
          </div>
        </div>

        {/* Inbox Items */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No items in your inbox</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  item.status === "UNREAD" ? "border-l-4 border-blue-500" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeBadge(item.type)}
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="mb-2">
                      <span className="font-semibold">
                        {item.requester.name || "Unknown User"}
                      </span>
                      <span className="text-gray-600">
                        {" "}
                        ({item.requester.email})
                      </span>
                    </div>

                    <div className="text-sm text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: item.overtimePost.shiftColour.colour,
                          }}
                        />
                        <span className="font-medium">
                          {item.overtimePost.area.name}
                        </span>
                        <span>•</span>
                        <span>{item.overtimePost.shiftColour.name}</span>
                        <span>•</span>
                        <span>{formatDate(item.overtimePost.date)}</span>
                        <span>•</span>
                        <span>
                          {item.overtimePost.startTime} - {item.overtimePost.endTime}
                        </span>
                      </div>
                    </div>

                    {item.type === "CANCELLATION_REQUEST" && item.cancellationRequestedReason && (
                      <div className="text-sm text-gray-700 mb-2 bg-yellow-50 border-l-4 border-yellow-400 p-2">
                        <span className="font-semibold">Reason: </span>
                        <span>{item.cancellationRequestedReason}</span>
                      </div>
                    )}

                    <div className="text-xs text-gray-500">
                      Requested: {formatDateTime(item.createdAt)}
                      {item.resolvedAt && (
                        <> • Resolved: {formatDateTime(item.resolvedAt)}</>
                      )}
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    {item.type === "CANCELLATION_REQUEST" && item.status !== "RESOLVED" && (
                      <>
                        <button
                          onClick={(e) => handleApproveCancellation(e, item.applicationId)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                        >
                          Approve Cancellation
                        </button>
                        <button
                          onClick={(e) => handleRejectCancellation(e, item.applicationId)}
                          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                        >
                          Reject Cancellation
                        </button>
                      </>
                    )}
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
