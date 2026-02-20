"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  UserGroupIcon,
  Cog8ToothIcon,
  WrenchScrewdriverIcon,
  InboxIcon,
} from "@heroicons/react/24/solid";

type UserMenuDropdownProps = {
  userRole: string;
};

export default function UserMenuDropdown({ userRole }: UserMenuDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const isManager = userRole === "MANAGER" || userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isSuperAdmin = userRole === "SUPER_ADMIN";

  // Fetch unread count for managers/admins
  useEffect(() => {
    if (isManager) {
      fetchUnreadCount();
      // Refresh count every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isManager]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/inbox?status=UNREAD");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.length);
      }
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const menuItems = [
    {
      label: "My Overtime",
      icon: CalendarIcon,
      href: "/dashboard",
      show: true,
    },
    {
      label: "Available Overtime",
      icon: ClockIcon,
      href: "/dashboard/available",
      show: true,
    },
    {
      label: "My Requests",
      icon: ClipboardDocumentListIcon,
      href: "/dashboard/requests",
      show: true,
    },
    {
      label: "Inbox",
      icon: InboxIcon,
      href: "/inbox",
      show: isManager,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      label: "Manager Approvals",
      icon: UserGroupIcon,
      href: "/manager/overtime-posts",
      show: isManager,
    },
    {
      label: "Admin Panel",
      icon: Cog8ToothIcon,
      href: "/admin",
      show: isAdmin,
    },
    {
      label: "All Overtime Posts",
      icon: ClipboardDocumentListIcon,
      href: "/admin/overtime-posts",
      show: isAdmin,
    },
    {
      label: "History",
      icon: ClipboardDocumentListIcon,
      href: "/admin/history",
      show: isAdmin,
    },
    {
      label: "SuperAdmin Settings",
      icon: WrenchScrewdriverIcon,
      href: "/admin/config",
      show: isSuperAdmin,
    },
  ];

  const visibleItems = menuItems.filter(item => item.show);

  const handleItemClick = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  return (
    <div ref={dropdownRef} className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors text-sm"
      >
        <CalendarIcon className="w-5 h-5" />
        <span className="hidden sm:inline">Menu</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-lg bg-zinc-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="px-1 py-1">
            {visibleItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleItemClick(item.href)}
                className="text-zinc-300 hover:bg-zinc-700 hover:text-white group flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors"
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
                  {item.label}
                </div>
                {item.badge && (
                  <span className="ml-auto bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
