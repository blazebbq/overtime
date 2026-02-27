"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { 
  ArrowRightOnRectangleIcon, 
  UserCircleIcon, 
  Cog6ToothIcon, 
  Bars3Icon, 
  XMarkIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  Cog8ToothIcon,
  WrenchScrewdriverIcon,
  InboxIcon,
} from "@heroicons/react/24/solid";
import UserMenuDropdown from "./UserMenuDropdown";
import { useState, useEffect } from "react";

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Get user role early for hook dependencies
  const user = session?.user;
  const userRole = (user as { role?: string })?.role || "USER";
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isManager = userRole === "MANAGER" || isAdmin;

  // Fetch unread count for managers/admins - MUST be declared before any returns
  useEffect(() => {
    // Only fetch if user is a manager/admin
    if (!isManager) return;

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

    fetchUnreadCount();
    
    // Refresh count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [isManager]);

  // Handle logout with absolute URL to prevent localhost redirect
  const handleLogout = () => {
    const callbackUrl = `${window.location.origin}/login`;
    signOut({ callbackUrl });
  };

  if (status === "loading") {
    return (
      <header className="bg-zinc-900 border-b border-zinc-800 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Overtime</h1>
          <div className="text-zinc-400">Loading...</div>
        </div>
      </header>
    );
  }

  if (!session) {
    return (
      <header className="bg-zinc-900 border-b border-zinc-800 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Overtime</h1>
          <button
            onClick={() => router.push("/login")}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
          >
            Login
          </button>
        </div>
      </header>
    );
  }

  // Define menu items
  const menuItems = [
    {
      label: "Overtime Dashboard",
      icon: CalendarIcon,
      href: "/overtime-dashboard",
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
      label: "My Inbox",
      icon: InboxIcon,
      href: "/user-inbox",
      show: !isManager, // Only for regular users, managers use the manager inbox
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

  const visibleMenuItems = menuItems.filter(item => item.show);

  const handleMenuItemClick = (href: string) => {
    setMobileMenuOpen(false);
    router.push(href);
  };

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <h1 
          className="text-xl font-bold text-white cursor-pointer hover:text-blue-400 transition-colors"
          onClick={() => router.push("/")}
        >
          Overtime
        </h1>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <UserCircleIcon className="w-6 h-6 text-zinc-400" />
            <div className="text-right">
              <div className="text-sm font-semibold">{user?.name}</div>
              <div className="text-xs text-zinc-400">{user?.email}</div>
            </div>
            {isSuperAdmin && (
              <span className="ml-2 px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded">
                SUPER ADMIN
              </span>
            )}
            {isAdmin && !isSuperAdmin && (
              <span className="ml-2 px-2 py-1 text-xs font-semibold bg-purple-600 text-white rounded">
                ADMIN
              </span>
            )}
            {isManager && !isAdmin && (
              <span className="ml-2 px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded">
                MANAGER
              </span>
            )}
          </div>

          {/* User Menu Dropdown */}
          <UserMenuDropdown userRole={userRole} />

          <button
            onClick={() => router.push("/settings")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors text-sm"
            title="Settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          title="Menu"
        >
          {mobileMenuOpen ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu Sidebar */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed top-0 left-0 h-full w-64 bg-zinc-900 z-50 md:hidden shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-zinc-800 text-white transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* User Info Section */}
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <UserCircleIcon className="w-10 h-10 text-zinc-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
                  <div className="text-xs text-zinc-400 truncate">{user?.email}</div>
                </div>
              </div>
              <div className="mt-2">
                {isSuperAdmin && (
                  <span className="inline-block px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded">
                    SUPER ADMIN
                  </span>
                )}
                {isAdmin && !isSuperAdmin && (
                  <span className="inline-block px-2 py-1 text-xs font-semibold bg-purple-600 text-white rounded">
                    ADMIN
                  </span>
                )}
                {isManager && !isAdmin && (
                  <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded">
                    MANAGER
                  </span>
                )}
              </div>
            </div>

            {/* Navigation Items */}
            <div className="py-2">
              {visibleMenuItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleMenuItemClick(item.href)}
                  className="w-full flex items-center justify-between px-4 py-3 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Settings and Logout at Bottom */}
            <div className="border-t border-zinc-800 p-2 mt-auto">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push("/settings");
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <Cog6ToothIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Settings</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
