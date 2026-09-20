/** Minimal CSV parser that supports quoted fields and newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const pushCell = () => {
    row.push(cell);
    cell = "";
  };
  const pushRow = () => {
    // Skip fully empty trailing rows
    if (row.some((value) => value.trim().length > 0)) {
      rows.push(row);
    }
    row = [];
  };

  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    const next = input[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      pushCell();
    } else if (ch === "\r") {
      // ignore; handle on \n
    } else if (ch === "\n") {
      pushCell();
      pushRow();
    } else {
      cell += ch;
    }
  }

  pushCell();
  pushRow();
  return rows;
}

export function normalizeHeader(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
