"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";
import { EyeIcon } from "@heroicons/react/24/solid";

type OvertimePost = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredPeople: number;
  approvedCount: number;
  status: string;
  area: {
    name: string;
  };
  shiftColour: {
    name: string;
    hexColor: string;
  };
  _count: {
    applications: number;
  };
};

export default function ManagerOvertimePostsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<OvertimePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.replace("/login");
      return;
    }
    
    const userRole = (session?.user as { role?: string })?.role;
    if (userRole !== "MANAGER" && userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      router.replace("/");
    } else {
      loadPosts();
    }
  }, [status, session, router]);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/manager/overtime-posts");
      if (!res.ok) throw new Error("Failed to fetch overtime posts");
      const data = await res.json();
      setPosts(data);
    } catch (err) {
      console.error("Failed to load posts:", err);
      setError("Failed to load overtime posts");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Header />
        <main className="p-4 max-w-6xl mx-auto">
          <div className="text-center text-zinc-400">Loading...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="p-4 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Overtime Posts - Manager View</h1>
          <p className="text-zinc-400">Review overtime opportunities and their applications</p>
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 border-2 border-red-500 rounded-xl text-red-200">
            {error}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-zinc-400 text-lg">No overtime posts available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const slotsAvailable = post.requiredPeople - post.approvedCount;
              const isFull = slotsAvailable === 0;
              const pendingCount = post._count.applications - post.approvedCount;

              return (
                <div
                  key={post.id}
                  className={`p-6 rounded-xl border-2 ${
                    isFull 
                      ? "bg-zinc-800/50 border-zinc-700" 
                      : "bg-zinc-800 border-blue-500/50"
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: post.shiftColour.hexColor }}
                        />
                        <h3 className="text-xl font-bold text-white">
                          {post.shiftColour.name} Shift - {post.area.name}
                        </h3>
                      </div>
                      <p className="text-sm text-zinc-400">
                        {new Date(post.date).toDateString()} • {post.startTime} – {post.endTime}
                      </p>
                    </div>
                    <div className="text-right">
                      {isFull ? (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-600 text-white">
                          ✓ FULLY STAFFED
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-white">
                          {slotsAvailable} SLOTS AVAILABLE
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-zinc-700/50 p-3 rounded-lg">
                      <div className="text-xs text-zinc-400">Required</div>
                      <div className="text-2xl font-bold text-white">{post.requiredPeople}</div>
                    </div>
                    <div className="bg-zinc-700/50 p-3 rounded-lg">
                      <div className="text-xs text-zinc-400">Approved</div>
                      <div className="text-2xl font-bold text-green-400">{post.approvedCount}</div>
                    </div>
                    <div className="bg-zinc-700/50 p-3 rounded-lg">
                      <div className="text-xs text-zinc-400">Pending</div>
                      <div className="text-2xl font-bold text-yellow-400">{pendingCount}</div>
                    </div>
                    <div className="bg-zinc-700/50 p-3 rounded-lg">
                      <div className="text-xs text-zinc-400">Available</div>
                      <div className="text-2xl font-bold text-blue-400">{slotsAvailable}</div>
                    </div>
                  </div>

                  <Link
                    href={`/manager/overtime-posts/${post.id}`}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
                  >
                    <EyeIcon className="w-5 h-5" />
                    View Applications ({post._count.applications})
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
