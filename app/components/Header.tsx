"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowRightOnRectangleIcon, UserCircleIcon, Cog6ToothIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/solid";
import UserMenuDropdown from "./UserMenuDropdown";
import { useState } from "react";

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const user = session.user;
  const userRole = (user as { role?: string }).role || "USER";
  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";
  const isManager = userRole === "MANAGER" || isAdmin;

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
            onClick={() => signOut({ callbackUrl: "/login" })}
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

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 border-t border-zinc-800 pt-4 space-y-3">
          <div className="flex items-center gap-2 text-white pb-3 border-b border-zinc-800">
            <UserCircleIcon className="w-6 h-6 text-zinc-400" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{user?.name}</div>
              <div className="text-xs text-zinc-400">{user?.email}</div>
            </div>
            {isSuperAdmin && (
              <span className="px-2 py-1 text-xs font-semibold bg-red-600 text-white rounded">
                SUPER ADMIN
              </span>
            )}
            {isAdmin && !isSuperAdmin && (
              <span className="px-2 py-1 text-xs font-semibold bg-purple-600 text-white rounded">
                ADMIN
              </span>
            )}
            {isManager && !isAdmin && (
              <span className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded">
                MANAGER
              </span>
            )}
          </div>

          {/* Mobile User Menu Dropdown */}
          <UserMenuDropdown userRole={userRole} />

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              router.push("/settings");
            }}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors text-sm"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            <span>Settings</span>
          </button>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              signOut({ callbackUrl: "/login" });
            }}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </header>
  );
}
