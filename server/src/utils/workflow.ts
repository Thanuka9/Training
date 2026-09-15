import type { WorkflowStatus } from "../types/domain.js";
import { AppError } from "./appError.js";

export const USER_EDITABLE_STATUSES: WorkflowStatus[] = ["DRAFT", "RETURNED"];

export function canUserEditWorkflow(status: string) {
  return USER_EDITABLE_STATUSES.includes(status as WorkflowStatus);
}

export function assertUserCanEdit(status: string) {
  if (!canUserEditWorkflow(status)) {
    throw new AppError(
      409,
      "WORKFLOW_LOCKED",
      "This record can only be edited while it is a draft or returned for correction",
    );
  }
}

export function assertTransition(from: string, to: WorkflowStatus) {
  const allowed: Record<WorkflowStatus, WorkflowStatus[]> = {
    DRAFT: ["SUBMITTED"],
    SUBMITTED: ["APPROVED", "RETURNED", "REJECTED"],
    RETURNED: ["SUBMITTED"],
    APPROVED: [],
    REJECTED: [],
  };

  if (!allowed[from as WorkflowStatus]?.includes(to)) {
    throw new AppError(
      409,
      "INVALID_TRANSITION",
      `Cannot change workflow status from ${from} to ${to}`,
    );
  }
}

export function datesAreValid(fromDate: Date, toDate: Date) {
  return toDate.getTime() >= fromDate.getTime();
}

export function completionRate(completed: number, notCompleted: number) {
  const denominator = completed + notCompleted;
  if (denominator === 0) return 0;
  return Number(((completed / denominator) * 100).toFixed(1));
}

export function sameDateRange(
  aFrom: Date,
  aTo: Date,
  bFrom: Date,
  bTo: Date,
) {
  return aFrom.getTime() === bFrom.getTime() && aTo.getTime() === bTo.getTime();
}
