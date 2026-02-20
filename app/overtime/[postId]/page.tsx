"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import Header from "../../components/Header";

type AcceptedWorker = {
  id: string;
  user: {
    id: string;
    name: string;
  };
  approvedStartTime: string | null;
  approvedEndTime: string | null;
  requestType: string;
};

type OvertimePost = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredPeople: number;
  approvedCount: number;
  area: {
    id: string;
    name: string;
  };
  shiftColour: {
    id: string;
    name: string;
    hexColor: string;
  };
  acceptedWorkers: AcceptedWorker[];
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTextColor(hexColor: string): string {
  if (!hexColor || !/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
    return "text-white";
  }
  
  const luminance = parseInt(hexColor.slice(1, 3), 16) * 0.299 +
                   parseInt(hexColor.slice(3, 5), 16) * 0.587 +
                   parseInt(hexColor.slice(5, 7), 16) * 0.114;
  return luminance < 128 ? "text-white" : "text-gray-900";
}

export default function OvertimePostDetails() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;
  
  const [post, setPost] = useState<OvertimePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated" && postId) {
      loadPostDetails();
    }
  }, [status, postId]);

  const loadPostDetails = async () => {
    try {
      const res = await fetch(`/api/overtime/${postId}/details`);
      if (!res.ok) throw new Error("Failed to fetch post details");
      const data = await res.json();
      setPost(data);
    } catch (err) {
      console.error("Failed to load post details:", err);
      setError("Failed to load overtime details");
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <>
        <Header />
        <main className="p-4 max-w-4xl mx-auto">
          <div className="text-center text-zinc-400">Loading overtime details...</div>
        </main>
      </>
    );
  }

  if (error || !post) {
    return (
      <>
        <Header />
        <main className="p-4 max-w-4xl mx-auto">
          <div className="bg-red-500 text-white p-4 rounded-md mb-4">
            {error || "Overtime not found"}
          </div>
          <button
            onClick={() => router.back()}
            className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-md"
          >
            Go Back
          </button>
        </main>
      </>
    );
  }

  const textColor = getTextColor(post.shiftColour.hexColor);

  return (
    <>
      <Header />
      <main className="p-4 max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded-md mb-4"
          >
            ← Back
          </button>
          
          <h1 className="text-3xl font-bold text-white mb-2">Overtime Details</h1>
        </div>

        {/* Overtime Info Card */}
        <div
          className="rounded-lg shadow-lg p-6 mb-6"
          style={{ backgroundColor: post.shiftColour.hexColor }}
        >
          <h2 className={`text-2xl font-bold mb-4 ${textColor}`}>
            {post.area.name} - {post.shiftColour.name} Shift
          </h2>
          
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${textColor}`}>
            <div>
              <p className="font-semibold">Date:</p>
              <p className="text-lg">{formatDate(post.date)}</p>
            </div>
            
            <div>
              <p className="font-semibold">Time:</p>
              <p className="text-lg">{post.startTime} - {post.endTime}</p>
            </div>
            
            <div>
              <p className="font-semibold">Slots:</p>
              <p className="text-lg">
                {post.approvedCount} / {post.requiredPeople} filled
              </p>
            </div>
            
            <div>
              <p className="font-semibold">Status:</p>
              <p className="text-lg">
                {post.approvedCount >= post.requiredPeople ? "FULL" : "Open"}
              </p>
            </div>
          </div>
        </div>

        {/* Accepted Workers Section */}
        <div className="bg-zinc-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            Accepted Workers ({post.acceptedWorkers.length})
          </h2>
          
          {post.acceptedWorkers.length === 0 ? (
            <div className="text-center text-zinc-400 py-8">
              No one accepted yet.
            </div>
          ) : (
            <div className="space-y-3">
              {post.acceptedWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="bg-zinc-700 rounded-md p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="text-white font-semibold text-lg">
                      {worker.user.name}
                    </p>
                    {worker.requestType === "PARTIAL" && worker.approvedStartTime && worker.approvedEndTime ? (
                      <p className="text-zinc-400 text-sm">
                        Working: {worker.approvedStartTime} - {worker.approvedEndTime}
                      </p>
                    ) : (
                      <p className="text-zinc-400 text-sm">
                        Working: {post.startTime} - {post.endTime} (Full shift)
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                      ✓ Approved
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
