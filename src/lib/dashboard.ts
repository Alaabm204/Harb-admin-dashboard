import { createAdminRequest } from "@/lib/adminRequest"

export interface DashboardStats { totalProducts: number; totalProjects: number; totalMessages: number; unreadMessages: number; }

const API_BASE = "/api/proxy/admin/dashboard";

const adminRequest = createAdminRequest();

export async function getDashboardStatistics(): Promise<DashboardStats> {
  const response = await adminRequest<any>(`${API_BASE}/statistics`, { method: "GET" });
  // Backend nests the counters under data.summary.
  const data = response?.data?.summary ?? response?.data ?? {};
  return {
    totalProducts: Number(data.totalProducts ?? 0),
    totalProjects: Number(data.totalProjects ?? 0),
    totalMessages: Number(data.totalMessages ?? 0),
    unreadMessages: Number(data.unreadMessages ?? 0),
  };
}
