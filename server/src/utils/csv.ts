export function toCsv(rows: Record<string, unknown>[], headers?: string[]) {
  if (!rows.length && !headers?.length) return "";
  const keys = headers ?? Object.keys(rows[0] ?? {});
  const escape = (value: unknown) => {
    const text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
    if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
    return text;
  };
  return [keys.join(","), ...rows.map((row) => keys.map((header) => escape(row[header])).join(","))].join("\n");
}
