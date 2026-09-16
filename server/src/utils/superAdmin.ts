import { env } from "../config/env.js";

/** Bank ID of the single super admin (from ADMIN_BANK_ID, else hardcoded default). */
export function getSuperAdminBankId() {
  const fromEnv = env.ADMIN_BANK_ID?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : "ADMIN001";
}

export function isSuperAdminBankId(bankId: string) {
  return bankId === getSuperAdminBankId();
}
