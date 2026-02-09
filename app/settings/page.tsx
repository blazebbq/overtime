"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Header from "../components/Header";
import { UserCircleIcon, LockClosedIcon, CheckCircleIcon, EnvelopeIcon } from "@heroicons/react/24/solid";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
    if (status === "authenticated") {
      loadProfile();
    }
  }, [status, router]);

  const loadProfile = async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setName(data.name || "");
      setSecondaryEmail(data.secondaryEmail || "");
    } catch (err) {
      console.error("Failed to load profile:", err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate password confirmation if changing password
    if (newPassword && newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const body: any = {};
      if (name !== session?.user?.name) {
        body.name = name;
      }
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      // Secondary email can be set, updated, or removed (empty string)
      body.secondaryEmail = secondaryEmail || null;

      if (!body.name && !body.newPassword && body.secondaryEmail === undefined) {
        setError("No changes to save");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update profile");
        return;
      }

      setSuccess(data.message || "Profile updated successfully!");
      
      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Update session if name changed
      if (body.name) {
        await update();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || profileLoading) {
    return (
      <>
        <Header />
        <main className="p-4 max-w-2xl mx-auto">
          <div className="text-center text-zinc-400">Loading...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="p-4 max-w-2xl mx-auto space-y-6">
        <div className="bg-zinc-900 rounded-2xl shadow-xl p-8 border border-zinc-800">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <UserCircleIcon className="w-8 h-8 text-blue-400" />
            Account Settings
          </h1>
          <p className="text-zinc-400 mb-8">
            Manage your account information and security settings
          </p>

          {error && (
            <div className="mb-6 bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-900/30 border border-green-700 text-green-300 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5" />
              {success}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-8">
            {/* Profile Information */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <UserCircleIcon className="w-6 h-6 text-zinc-400" />
                Profile Information
              </h2>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                  Primary Email (cannot be changed)
                </label>
                <input
                  id="email"
                  type="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-500 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email Notifications */}
            <div className="space-y-4 pt-6 border-t border-zinc-800">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <EnvelopeIcon className="w-6 h-6 text-zinc-400" />
                Email Notifications
              </h2>
              <p className="text-sm text-zinc-400">
                Add a secondary email to receive notifications at multiple addresses
              </p>

              <div>
                <label htmlFor="secondaryEmail" className="block text-sm font-medium text-zinc-300 mb-2">
                  Secondary Email (Optional)
                </label>
                <input
                  id="secondaryEmail"
                  type="email"
                  value={secondaryEmail}
                  onChange={(e) => setSecondaryEmail(e.target.value)}
                  placeholder="e.g., personal@example.com"
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Overtime notifications will be sent to both your primary and secondary email addresses
                </p>
              </div>
            </div>

            {/* Change Password */}
            <div className="space-y-4 pt-6 border-t border-zinc-800">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <LockClosedIcon className="w-6 h-6 text-zinc-400" />
                Change Password
              </h2>
              <p className="text-sm text-zinc-400">
                Leave blank if you don't want to change your password
              </p>

              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-zinc-300 mb-2">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-300 mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-6 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="px-6 py-3 rounded-lg font-semibold text-white bg-zinc-700 hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
