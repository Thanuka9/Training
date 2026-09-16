import { api, toQuery } from "./client";
import type { NamedEntity, Paginated, Participation, PublicUser, TrainingProgram } from "@/types";

export type FilterParams = Record<string, string | number | boolean | undefined | null>;

export type OfficerDashboard = {
  user: PublicUser;
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
  recent: Participation[];
  yearly: Array<{ year: number; total: number; local: number; foreign: number }>;
};

export const adminApi = {
  lookups: () =>
    api<{
      trainingTypes: NamedEntity[];
      institutions: NamedEntity[];
      participationRoles: NamedEntity[];
      completionStatuses: NamedEntity[];
      allowHybridDelivery: boolean;
    }>("/admin/lookups"),
  summary: (params: FilterParams = {}) => api<Record<string, unknown>>(`/admin/dashboard/summary${toQuery(params)}`),
  monthly: (params: FilterParams = {}) => api<{ year: number; months: { month: number; label: string; count: number }[] }>(`/admin/dashboard/monthly${toQuery(params)}`),
  distributions: (params: FilterParams = {}) =>
    api<{
      locationScope: { name: string; count: number }[];
      deliveryMode: { name: string; count: number }[];
      participationRole: { name: string; count: number }[];
      completionStatus: { name: string; count: number }[];
      trainingType: { name: string; count: number }[];
    }>(`/admin/dashboard/distributions${toQuery(params)}`),
  topInstitutions: (params: FilterParams = {}) =>
    api<{ name: string; count: number }[]>(`/admin/dashboard/top-institutions${toQuery(params)}`),
  topOfficers: (params: FilterParams = {}) =>
    api<{ name: string; bankId: string; count: number }[]>(`/admin/dashboard/top-officers${toQuery(params)}`),
  rankings: (params: FilterParams = {}) =>
    api<{
      fromYear: number;
      toYear: number;
      sortBy: string;
      rows: Array<{
        id: string;
        officer: string;
        bankId: string;
        status: string;
        total: number;
        local: number;
        foreign: number;
        physical: number;
        online: number;
        hybrid: number;
        completed: number;
      }>;
    }>(`/admin/dashboard/rankings${toQuery(params)}`),
  yearly: (params: FilterParams = {}) =>
    api<{
      fromYear: number;
      toYear: number;
      locationScope: string | null;
      deliveryMode: string | null;
      years: Array<{ year: number; label: string; total: number; local: number; foreign: number }>;
    }>(`/admin/dashboard/yearly${toQuery(params)}`),
  compare: (params: FilterParams = {}) =>
    api<{
      a: OfficerDashboard;
      b: OfficerDashboard;
      comparisonTable: Array<{ metric: string; label: string; a: number; b: number; diff: number }>;
      yearlyCompare: Array<{
        year: number;
        label: string;
        aTotal: number;
        bTotal: number;
        aLocal: number;
        bLocal: number;
        aForeign: number;
        bForeign: number;
      }>;
    }>(`/admin/dashboard/compare${toQuery(params)}`),
  officers: () =>
    api<Array<{ id: string; fullName: string; bankId: string; status: string; attended: number }>>("/admin/officers"),
  selfDashboard: () => api<OfficerDashboard>("/admin/me/dashboard"),
  userDashboard: (id: string) => api<OfficerDashboard>(`/admin/users/${id}/dashboard`),
  users: (params: FilterParams = {}) => api<Paginated<PublicUser>>(`/admin/users${toQuery(params)}`),
  user: (id: string) => api<PublicUser>(`/admin/users/${id}`),
  createUser: (payload: unknown) => api<PublicUser>("/admin/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id: string, payload: unknown) =>
    api<PublicUser>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  approveUser: (id: string) => api<PublicUser>(`/admin/users/${id}/approve`, { method: "POST" }),
  rejectUser: (id: string) => api<PublicUser>(`/admin/users/${id}/reject`, { method: "POST" }),
  disableUser: (id: string) => api<PublicUser>(`/admin/users/${id}/disable`, { method: "POST" }),
  reactivateUser: (id: string) => api<PublicUser>(`/admin/users/${id}/reactivate`, { method: "POST" }),
  programs: (params: FilterParams = {}) => api<Paginated<TrainingProgram>>(`/admin/training-programs${toQuery(params)}`),
  program: (id: string) => api<TrainingProgram>(`/admin/training-programs/${id}`),
  createProgram: (payload: unknown) =>
    api<TrainingProgram>("/admin/training-programs", { method: "POST", body: JSON.stringify(payload) }),
  updateProgram: (id: string, payload: unknown) =>
    api<TrainingProgram>(`/admin/training-programs/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  archiveProgram: (id: string) =>
    api<TrainingProgram>(`/admin/training-programs/${id}`, { method: "DELETE" }),
  participations: (params: FilterParams = {}) =>
    api<Paginated<Participation>>(`/admin/participations${toQuery(params)}`),
  participation: (id: string) =>
    api<{ record: Participation; audit: Array<Record<string, unknown>> }>(`/admin/participations/${id}`),
  updateParticipation: (id: string, payload: unknown) =>
    api<Participation>(`/admin/participations/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  approveParticipation: (id: string) =>
    api<Participation>(`/admin/participations/${id}/approve`, { method: "POST" }),
  returnParticipation: (id: string, comment: string) =>
    api<Participation>(`/admin/participations/${id}/return`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
  rejectParticipation: (id: string, comment: string) =>
    api<Participation>(`/admin/participations/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ comment }),
    }),
  trainingTypes: (params: FilterParams = {}) =>
    api<Paginated<NamedEntity>>(`/admin/training-types${toQuery(params)}`),
  createTrainingType: (payload: unknown) =>
    api<NamedEntity>("/admin/training-types", { method: "POST", body: JSON.stringify(payload) }),
  updateTrainingType: (id: string, payload: unknown) =>
    api<NamedEntity>(`/admin/training-types/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  institutions: (params: FilterParams = {}) =>
    api<Paginated<NamedEntity>>(`/admin/institutions${toQuery(params)}`),
  createInstitution: (payload: unknown) =>
    api<NamedEntity>("/admin/institutions", { method: "POST", body: JSON.stringify(payload) }),
  updateInstitution: (id: string, payload: unknown) =>
    api<NamedEntity>(`/admin/institutions/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  roles: (params: FilterParams = {}) =>
    api<Paginated<NamedEntity>>(`/admin/participation-roles${toQuery(params)}`),
  createRole: (payload: unknown) =>
    api<NamedEntity>("/admin/participation-roles", { method: "POST", body: JSON.stringify(payload) }),
  updateRole: (id: string, payload: unknown) =>
    api<NamedEntity>(`/admin/participation-roles/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  completionStatuses: (params: FilterParams = {}) =>
    api<Paginated<NamedEntity>>(`/admin/completion-statuses${toQuery(params)}`),
  createCompletionStatus: (payload: unknown) =>
    api<NamedEntity>("/admin/completion-statuses", { method: "POST", body: JSON.stringify(payload) }),
  updateCompletionStatus: (id: string, payload: unknown) =>
    api<NamedEntity>(`/admin/completion-statuses/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  trainingRegister: (params: FilterParams = {}) =>
    api<Array<Record<string, unknown>>>(`/admin/reports/training-register${toQuery(params)}`),
  officerSummary: (params: FilterParams = {}) =>
    api<{
      columns: { key: string; label: string }[];
      rows: Array<Record<string, unknown>>;
      neverAttended: number;
      withTraining: number;
    }>(`/admin/reports/officer-summary${toQuery(params)}`),
  officerActivity: (params: FilterParams = {}) =>
    api<{
      totals: { officers: number; withTraining: number; neverAttended: number };
      rows: Array<Record<string, unknown>>;
    }>(`/admin/reports/officer-activity${toQuery(params)}`),
  programSummary: (params: FilterParams = {}) =>
    api<Array<Record<string, unknown>>>(`/admin/reports/program-summary${toQuery(params)}`),
  institutionSummary: (params: FilterParams = {}) =>
    api<Array<Record<string, unknown>>>(`/admin/reports/institution-summary${toQuery(params)}`),
  audit: (params: FilterParams = {}) =>
    api<Paginated<Record<string, unknown>>>(`/admin/audit${toQuery(params)}`),
  settings: () => api<{ id: string; allowHybridDelivery: boolean }>(`/admin/settings`),
  updateSettings: (payload: { allowHybridDelivery: boolean }) =>
    api<{ id: string; allowHybridDelivery: boolean }>(`/admin/settings`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};

export function exportUrl(
  report:
    | "training-register"
    | "officer-summary"
    | "officer-activity"
    | "program-summary"
    | "institution-summary"
    | "users"
    | "records",
  kind: "xlsx" | "csv",
  params: FilterParams = {},
) {
  return `/api/admin/exports/${report}.${kind}${toQuery(params)}`;
}
