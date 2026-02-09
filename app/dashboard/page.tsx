"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/Header";

export default function DashboardHub() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <>
        <Header />
        <main className="p-4 max-w-4xl mx-auto">
          <div className="text-center text-zinc-400">Loading...</div>
        </main>
      </>
    );
  }

  const dashboardCards = [
    {
      title: "My Upcoming Overtime",
      description: "View your approved future overtime shifts",
      icon: "📅",
      href: "/dashboard/upcoming",
      gradient: "from-blue-500 to-purple-600",
    },
    {
      title: "My Requests",
      description: "Track all your overtime applications and their status",
      icon: "📋",
      href: "/dashboard/requests",
      gradient: "from-green-500 to-teal-600",
    },
    {
      title: "Available Overtime",
      description: "Browse and apply for open overtime opportunities",
      icon: "🔓",
      href: "/dashboard/available",
      gradient: "from-orange-500 to-red-600",
    },
  ];

  return (
    <>
      <Header />
      <main className="p-4 max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">
            Overtime Dashboard
          </h1>
          <p className="text-zinc-400 text-lg">
            Manage your overtime applications and schedule
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {dashboardCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`
                group relative overflow-hidden
                rounded-2xl p-6 
                bg-gradient-to-br ${card.gradient}
                shadow-2xl hover:shadow-3xl
                transform transition-all duration-300
                hover:scale-105 hover:-translate-y-1
                cursor-pointer
              `}
            >
              <div className="relative z-10">
                <div className="text-6xl mb-4">{card.icon}</div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {card.title}
                </h2>
                <p className="text-white/80 text-sm">
                  {card.description}
                </p>
              </div>
              
              {/* Decorative overlay */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-300" />
            </Link>
          ))}
        </div>

        {/* Quick info section */}
        <div className="mt-8 p-6 bg-zinc-800 rounded-xl border border-zinc-700">
          <h3 className="text-xl font-bold text-white mb-3">
            ℹ️ How It Works
          </h3>
          <ul className="space-y-2 text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 font-bold">1.</span>
              <span>Browse <strong>Available Overtime</strong> and apply for shifts that fit your schedule</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 font-bold">2.</span>
              <span>Track your applications in <strong>My Requests</strong> to see approval status</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 font-bold">3.</span>
              <span>Check <strong>My Upcoming Overtime</strong> for your confirmed shifts</span>
            </li>
          </ul>
        </div>
      </main>
    </>
  );
}
