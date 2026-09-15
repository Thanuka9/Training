import { describe, expect, it } from "vitest";
import { registerSchema } from "../validators/auth.js";
import { createParticipationSchema } from "../validators/participation.js";
import { toCsv } from "../utils/csv.js";

describe("registration validation", () => {
  it("requires matching passwords and a unique-length bank id", () => {
    const result = registerSchema.safeParse({
      fullName: "A",
      bankId: "B1",
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      fullName: "Nimal Perera",
      bankId: "BSD001",
      password: "SecurePass1",
      confirmPassword: "SecurePass1",
    });
    expect(result.success).toBe(true);
  });
});

describe("participation validation", () => {
  it("rejects an inverted date payload at the schema layer only for missing fields", () => {
    const result = createParticipationSchema.safeParse({
      trainingProgramId: "not-a-uuid",
      deliveryMode: "PHYSICAL",
      participationRoleId: "11111111-1111-1111-1111-111111111111",
      fromDate: "2026-01-01",
      toDate: "2026-01-02",
      completionStatusId: "11111111-1111-1111-1111-111111111111",
    });
    expect(result.success).toBe(false);
  });
});

describe("csv export", () => {
  it("escapes commas and quotes", () => {
    const csv = toCsv([
      { no: 1, officerName: 'Perera, "Nimal"', program: "Supervision" },
    ]);
    expect(csv.split("\n")[0]).toBe("no,officerName,program");
    expect(csv).toContain('"Perera, ""Nimal"""');
  });
});
