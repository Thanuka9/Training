import { describe, expect, it } from "vitest";

/**
 * Documents the business rule: one officer may attend many programmes in a year.
 * Soft duplicate detection only fires for the same programme + same From/To dates.
 */
function isSoftDuplicateCandidate(a: {
  userId: string;
  trainingProgramId: string;
  fromDate: string;
  toDate: string;
}, b: {
  userId: string;
  trainingProgramId: string;
  fromDate: string;
  toDate: string;
}) {
  return (
    a.userId === b.userId &&
    a.trainingProgramId === b.trainingProgramId &&
    a.fromDate === b.fromDate &&
    a.toDate === b.toDate
  );
}

describe("multi-training per year", () => {
  const officer = "user-1";
  const programmeA = "prog-a";
  const programmeB = "prog-b";

  it("allows two different programmes in the same year for one officer", () => {
    const first = {
      userId: officer,
      trainingProgramId: programmeA,
      fromDate: "2026-03-10",
      toDate: "2026-03-12",
    };
    const second = {
      userId: officer,
      trainingProgramId: programmeB,
      fromDate: "2026-09-01",
      toDate: "2026-09-05",
    };
    expect(isSoftDuplicateCandidate(first, second)).toBe(false);
  });

  it("flags only an exact programme and date rematch", () => {
    const first = {
      userId: officer,
      trainingProgramId: programmeA,
      fromDate: "2026-03-10",
      toDate: "2026-03-12",
    };
    const sameAgain = { ...first };
    expect(isSoftDuplicateCandidate(first, sameAgain)).toBe(true);
  });

  it("sums attended count across multiple records", () => {
    const records = [
      { userId: officer, workflowStatus: "SUBMITTED" },
      { userId: officer, workflowStatus: "APPROVED" },
      { userId: officer, workflowStatus: "DRAFT" },
      { userId: "other", workflowStatus: "APPROVED" },
    ];
    const attended = records.filter(
      (item) => item.userId === officer && item.workflowStatus !== "DRAFT",
    ).length;
    expect(attended).toBe(2);
  });
});
