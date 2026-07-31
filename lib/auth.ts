import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export type UserRole = "USER" | "ADMIN" | "MANAGER" | "SUPER_ADMIN";

export async function getAuthUser() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }
  
  return {
    id: (session.user as any).id,
    email: session.user.email || "",
    name: session.user.name || "",
    role: (session.user as any).role as UserRole || "USER",
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
  
  // ADMIN and SUPER_ADMIN can access admin routes
  if (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
      user: null
    };
  }
  
  return { user, error: null };
}

export async function requireManager() {
  const { user, error } = await requireAuth();
  
  if (error) {
    return { user: null, error };
  }
  
  // MANAGER, ADMIN, and SUPER_ADMIN can access manager routes
  if (user?.role !== "MANAGER" && user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json({ error: "Manager access required" }, { status: 403 }),
      user: null
    };
  }
  
  return { user, error: null };
}

export async function requireManagerOrAdmin() {
  const { user, error } = await requireAuth();
  
  if (error) {
    return { user: null, error };
  }
  
  // MANAGER, ADMIN, and SUPER_ADMIN can create overtime
  if (user?.role !== "MANAGER" && user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json({ error: "Manager or Admin access required" }, { status: 403 }),
      user: null
    };
  }
  
  return { user, error: null };
}

export async function requireSuperAdmin() {
  const { user, error } = await requireAuth();
  
  if (error) {
    return { user: null, error };
  }
  
  if (user?.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json({ error: "Super Admin access required" }, { status: 403 }),
      user: null
    };
  }
  
  return { user, error: null };
}

// Helper function to check if user has required role
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    USER: 1,
    MANAGER: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4,
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
