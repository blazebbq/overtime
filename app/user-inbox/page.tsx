"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";

type NotificationType = "APPROVED" | "REJECTED" | "CANCELLED" | "AUTO_REJECTED";
type NotificationStatus = "UNREAD" | "READ";

interface UserNotification {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  createdAt: string;
  message: string;
  overtimePost: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    area: {
      name: string;
    };
    shiftColour: {
      name: string;
      hexColor: string;
    };
  };
}

export default function UserInboxPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationStatus | "ALL">("ALL");

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const url =
        filter === "ALL"
          ? "/api/user-notifications"
          : `/api/user-notifications?status=${filter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/user-notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId, status: "READ" }),
      });
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleNotificationClick = (notification: UserNotification) => {
    // Mark as read if unread
    if (notification.status === "UNREAD") {
      markAsRead(notification.id);
    }
    // Navigate to overtime details
    router.push(`/overtime/${notification.overtimePost.id}`);
  };

  const getTypeLabel = (type: NotificationType) => {
    const labels = {
      APPROVED: "Application Approved",
      REJECTED: "Application Rejected",
      CANCELLED: "Overtime Cancelled",
      AUTO_REJECTED: "Application Auto-Rejected",
    };
    return labels[type];
  };

  const getTypeBadge = (type: NotificationType) => {
    const styles = {
      APPROVED: "bg-green-500 text-white",
      REJECTED: "bg-red-500 text-white",
      CANCELLED: "bg-gray-500 text-white",
      AUTO_REJECTED: "bg-orange-500 text-white",
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

  const unreadCount = notifications.filter((n) => n.status === "UNREAD").length;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">My Inbox</h1>
            <p className="text-gray-600">
              View notifications about your overtime applications
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
                All ({notifications.length})
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
                onClick={() => setFilter("READ")}
                className={`flex-1 px-4 py-3 font-medium ${
                  filter === "READ"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Read
              </button>
            </div>
          </div>

          {/* Notifications */}
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No notifications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    notification.status === "UNREAD"
                      ? "border-l-4 border-blue-500"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeBadge(notification.type)}
                        {notification.status === "UNREAD" && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500 text-white">
                            NEW
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                notification.overtimePost.shiftColour.hexColor,
                            }}
                          />
                          <span className="font-medium">
                            {notification.overtimePost.area.name}
                          </span>
                          <span>•</span>
                          <span>
                            {notification.overtimePost.shiftColour.name}
                          </span>
                          <span>•</span>
                          <span>{formatDate(notification.overtimePost.date)}</span>
                          <span>•</span>
                          <span>
                            {notification.overtimePost.startTime} -{" "}
                            {notification.overtimePost.endTime}
                          </span>
                        </div>
                      </div>

                      <div className="text-gray-700 mb-2">
                        {notification.message}
                      </div>

                      <div className="text-xs text-gray-500">
                        {formatDateTime(notification.createdAt)}
                      </div>
                    </div>

                    <div className="ml-4">
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
