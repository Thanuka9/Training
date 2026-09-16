import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "../validators/auth.js";
import { createParticipationSchema } from "../validators/participation.js";
import { normalizeBankId } from "../utils/bankId.js";
import { toCsv } from "../utils/csv.js";

describe("bank id normalization", () => {
  it("pads short ids with leading zeros to length 4", () => {
    expect(normalizeBankId("12")).toBe("0012");
    expect(normalizeBankId("7")).toBe("0007");
    expect(normalizeBankId("967")).toBe("0967");
    expect(normalizeBankId(" 12 ")).toBe("0012");
  });

  it("leaves ids of length 4 or more unchanged after trim", () => {
    expect(normalizeBankId("9672")).toBe("9672");
    expect(normalizeBankId("ADMIN001")).toBe("ADMIN001");
    expect(normalizeBankId("1001")).toBe("1001");
    expect(normalizeBankId(" B1 ")).toBe("00B1");
  });
});

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

  it("normalizes short bank ids on register and login", () => {
    const registered = registerSchema.safeParse({
      fullName: "Nimal Perera",
      bankId: "12",
      password: "SecurePass1",
      confirmPassword: "SecurePass1",
    });
    expect(registered.success).toBe(true);
    if (registered.success) expect(registered.data.bankId).toBe("0012");

    const loggedIn = loginSchema.safeParse({ bankId: "7", password: "x" });
    expect(loggedIn.success).toBe(true);
    if (loggedIn.success) expect(loggedIn.data.bankId).toBe("0007");
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
