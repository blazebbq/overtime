"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/overtime-dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-white">Redirecting to Overtime Dashboard...</div>
    </div>
  );
}
