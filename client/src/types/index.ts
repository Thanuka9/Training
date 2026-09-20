export type Role = "USER" | "ADMIN";
export type UserStatus = "PENDING" | "ACTIVE" | "DISABLED" | "REJECTED" | "IMPORTED";
export type LocationScope = "LOCAL" | "FOREIGN";
export type DeliveryMode = "PHYSICAL" | "ONLINE" | "HYBRID";
export type WorkflowStatus = "DRAFT" | "SUBMITTED" | "RETURNED" | "APPROVED" | "REJECTED";

export type PublicUser = {
  id: string;
  bankId: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  isSuperAdmin?: boolean;
  trainingCount?: number;
  attended?: number;
  drafts?: number;
  completed?: number;
  local?: number;
  foreign?: number;
  physical?: number;
  online?: number;
  hybrid?: number;
  lastTrainingDate?: string | null;
  neverAttended?: boolean;
};

export type NamedEntity = {
  id: string;
  name: string;
  active: boolean;
  sortOrder?: number;
  isFinal?: boolean;
};

export type TrainingProgram = {
  id: string;
  name: string;
  locationScope: LocationScope;
  venue: string;
  description: string | null;
  active: boolean;
  trainingType: NamedEntity;
  institution: NamedEntity;
  createdBy?: { id: string; fullName: string; bankId: string };
  _count?: { participations: number };
};

export type Participation = {
  id: string;
  deliveryMode: DeliveryMode;
  fromDate: string;
  toDate: string;
  remarks: string | null;
  workflowStatus: WorkflowStatus;
  adminComment: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  officer: Pick<PublicUser, "id" | "bankId" | "fullName">;
  approvedBy: Pick<PublicUser, "id" | "bankId" | "fullName"> | null;
  participationRole: NamedEntity;
  completionStatus: NamedEntity;
  trainingProgram: TrainingProgram;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
