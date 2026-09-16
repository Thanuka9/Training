/** Trim, then pad with leading zeros to at least 4 characters. Longer IDs are unchanged. */
export function normalizeBankId(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;
  if (trimmed.length < 4) return trimmed.padStart(4, "0");
  return trimmed;
}

export function bankIdNeedsPadding(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length < 4;
}
