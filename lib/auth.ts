import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function getAuthUser() {
  const session = await getServerSession();
  
  if (!session?.user) {
    return null;
  }
  
  return {
    id: (session.user as any).id,
    email: session.user.email || "",
    name: session.user.name || "",
    role: (session.user as any).role || "USER",
  };
}

export async function requireAuth() {
  const user = await getAuthUser();
  
  if (!user) {
    return { 
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null 
    };
  }
  
  return { user, error: null };
}

export async function requireAdmin() {
  const { user, error } = await requireAuth();
  
  if (error) {
    return { user: null, error };
  }
  
  if (user?.role !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
      user: null
    };
  }
  
  return { user, error: null };
}
