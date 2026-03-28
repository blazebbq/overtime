"use client";

import { useState, useEffect } from "react";
import { CheckIcon, XMarkIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";

interface SmtpConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  user: string | null;
  password: string | null;
  fromEmail: string;
  enabled: boolean;
}

interface PinModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function PinModal({ onClose, onSuccess }: PinModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin === "2060") {
      onSuccess();
    } else {
      setError("Incorrect PIN");
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold text-white mb-4">Enter PIN to Access SMTP Settings</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError("");
            }}
            placeholder="Enter PIN"
            className="w-full px-4 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            autoFocus
          />
          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SmtpSettings() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Form state
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (isUnlocked) {
      loadConfig();
    }
  }, [isUnlocked]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/smtp-config");
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setConfig(data);
          setHost(data.host);
          setPort(data.port);
          setSecure(data.secure);
          setUser(data.user || "");
          setPassword(data.password || "");
          setFromEmail(data.fromEmail);
          setEnabled(data.enabled);
        }
      }
    } catch (err) {
      console.error("Failed to load SMTP config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setNotification("");
    
    try {
      const res = await fetch("/api/admin/smtp-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host,
          port,
          secure,
          user: user || null,
          password: password || null,
          fromEmail,
          enabled,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setNotification("SMTP configuration saved successfully");
        setTimeout(() => setNotification(""), 3000);
      } else {
        setNotification("Failed to save SMTP configuration");
      }
    } catch (err) {
      console.error("Failed to save SMTP config:", err);
      setNotification("Failed to save SMTP configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockClick = () => {
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setIsUnlocked(true);
    setShowPinModal(false);
  };

  if (!isUnlocked) {
    return (
      <div className="space-y-4">
        {showPinModal && (
          <PinModal
            onClose={() => setShowPinModal(false)}
            onSuccess={handlePinSuccess}
          />
        )}
        
        <div className="bg-zinc-800 rounded-lg p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-4">SMTP Settings</h3>
          <p className="text-zinc-400 mb-6">
            This section is PIN protected. Enter the PIN to access SMTP configuration.
          </p>
          <button
            onClick={handleUnlockClick}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Unlock SMTP Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notification && (
        <div className="p-4 bg-green-900 border border-green-700 rounded-lg">
          <p className="text-green-200">{notification}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-400 py-12">Loading...</div>
      ) : (
        <div className="bg-zinc-800 rounded-lg p-6 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">SMTP Configuration</h3>
            <label className="flex items-center space-x-2">
              <span className="text-sm text-zinc-400">Email Enabled</span>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                SMTP Host *
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="smtp.example.com"
                className="w-full px-4 py-2 bg-zinc-900 text-white border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Port *
              </label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-zinc-900 text-white border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-2 bg-zinc-900 text-white border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-2 bg-zinc-900 text-white border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                From Email *
              </label>
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="noreply@example.com"
                className="w-full px-4 py-2 bg-zinc-900 text-white border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-zinc-300">Use Secure Connection (TLS/SSL)</span>
              </label>
              <p className="text-xs text-zinc-500 mt-1">
                Self-signed certificates are automatically accepted
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              disabled={saving || !host || !port || !fromEmail}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
