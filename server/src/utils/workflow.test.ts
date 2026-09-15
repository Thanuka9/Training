import { describe, expect, it } from "vitest";
import {
  assertTransition,
  assertUserCanEdit,
  canUserEditWorkflow,
  completionRate,
  datesAreValid,
} from "./workflow.js";
import { AppError } from "./appError.js";

describe("workflow rules", () => {
  it("allows users to edit draft and returned records only", () => {
    expect(canUserEditWorkflow("DRAFT")).toBe(true);
    expect(canUserEditWorkflow("RETURNED")).toBe(true);
    expect(canUserEditWorkflow("SUBMITTED")).toBe(false);
    expect(canUserEditWorkflow("APPROVED")).toBe(false);
    expect(() => assertUserCanEdit("APPROVED")).toThrow(AppError);
  });

  it("enforces documented workflow transitions", () => {
    expect(() => assertTransition("DRAFT", "SUBMITTED")).not.toThrow();
    expect(() => assertTransition("SUBMITTED", "APPROVED")).not.toThrow();
    expect(() => assertTransition("SUBMITTED", "RETURNED")).not.toThrow();
    expect(() => assertTransition("SUBMITTED", "REJECTED")).not.toThrow();
    expect(() => assertTransition("RETURNED", "SUBMITTED")).not.toThrow();
    expect(() => assertTransition("APPROVED", "SUBMITTED")).toThrow(AppError);
    expect(() => assertTransition("DRAFT", "APPROVED")).toThrow(AppError);
  });

  it("requires toDate to be on or after fromDate", () => {
    expect(datesAreValid(new Date("2026-01-01"), new Date("2026-01-01"))).toBe(true);
    expect(datesAreValid(new Date("2026-01-02"), new Date("2026-01-01"))).toBe(false);
  });

  it("calculates completion rate from completed and not-completed only", () => {
    expect(completionRate(3, 1)).toBe(75);
    expect(completionRate(0, 0)).toBe(0);
  });
});
