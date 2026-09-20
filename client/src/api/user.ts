import { api, toQuery } from "./client";
import type { NamedEntity, Paginated, Participation, TrainingProgram } from "@/types";

export type UserDashboard = {
  filters: { year: number | null; locationScope: string | null; deliveryMode: string | null };
  kpis: {
    total: number;
    draft: number;
    pendingReview: number;
    approved: number;
    completed: number;
    local: number;
    foreign: number;
    physical: number;
    online: number;
    hybrid: number;
    attended: number;
  };
  distributions: {
    locationScope: { name: string; count: number }[];
    deliveryMode: { name: string; count: number }[];
    completionStatus: { name: string; count: number }[];
    participationRole: { name: string; count: number }[];
  };
  yearly: Array<{ year: number; label: string; total: number; local: number; foreign: number }>;
  recent: Participation[];
};

export const userApi = {
  dashboard: (params: Record<string, string | number | undefined> = {}) =>
    api<UserDashboard>(`/user/dashboard${toQuery(params)}`),
  lookups: () =>
    api<{
      trainingTypes: NamedEntity[];
      institutions: NamedEntity[];
      participationRoles: NamedEntity[];
      completionStatuses: NamedEntity[];
      allowHybridDelivery: boolean;
    }>("/user/lookups"),
  programs: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<TrainingProgram>>(`/user/training-programs${toQuery(params)}`),
  program: (id: string) => api<TrainingProgram>(`/user/training-programs/${id}`),
  participations: (params: Record<string, string | number | undefined> = {}) =>
    api<Paginated<Participation>>(`/user/participations${toQuery(params)}`),
  participation: (id: string) => api<Participation>(`/user/participations/${id}`),
  createParticipation: (payload: unknown) =>
    api<Participation>("/user/participations", { method: "POST", body: JSON.stringify(payload) }),
  updateParticipation: (id: string, payload: unknown) =>
    api<Participation>(`/user/participations/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  submitParticipation: (id: string) =>
    api<Participation>(`/user/participations/${id}/submit`, { method: "POST" }),
};
