import { api } from "./client";
import type { PublicUser } from "@/types";

export const authApi = {
  registerOptions: () =>
    api<{ jobPositions: Array<{ id: string; name: string; active: boolean; sortOrder?: number }> }>("/auth/register-options"),
  register: (payload: {
    fullName: string;
    bankId: string;
    jobPositionId: string;
    password: string;
    confirmPassword: string;
  }) =>
    api<{ user: PublicUser; message: string; claimedImported?: boolean }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: { bankId: string; password: string }) =>
    api<{ user: PublicUser }>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => api<{ message: string }>("/auth/logout", { method: "POST" }),
  me: () => api<{ user: PublicUser }>("/auth/me"),
  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => api<{ message: string }>("/auth/change-password", { method: "POST", body: JSON.stringify(payload) }),
};
