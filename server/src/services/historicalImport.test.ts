import { describe, expect, it } from "vitest";
import { parseFlexibleDate, parseHistoricalCsv } from "./historicalImportService.js";

describe("historical import helpers", () => {
  it("parses workbook date formats", () => {
    expect(parseFlexibleDate("1/28/2025")?.toISOString().slice(0, 10)).toBe("2025-01-28");
    expect(parseFlexibleDate("28/01/2025")?.toISOString().slice(0, 10)).toBe("2025-01-28");
    expect(parseFlexibleDate("03.04.2025")?.toISOString().slice(0, 10)).toBe("2025-04-03");
    expect(parseFlexibleDate("2025-02-19")?.toISOString().slice(0, 10)).toBe("2025-02-19");
    // Ambiguous: prefer D/M/Y (3 Apr, not 4 Mar)
    expect(parseFlexibleDate("3/4/2025")?.toISOString().slice(0, 10)).toBe("2025-04-03");
    expect(parseFlexibleDate("1/15/2025")?.toISOString().slice(0, 10)).toBe("2025-01-15");
  });

  it("parses the official historical CSV template", () => {
    const csv = `No.,Bank No,Name of the Officer,Name of the Training Program,Local / Foreign,Physical / Online,Type of Training,Participating the Training as,Duration,,Institution,Venue,Status of Completion
,,,,,,,,From,To,,,
1,9672,Thanuka Ellepola,Sample Historical Programme,Local,Physical,CBS Training,Participant,1/15/2025,1/16/2025,CBS,CBS Auditorium,Completed
2,111,,Blank Name Programme,Foreign,Online,Webinar,Panelist,2/1/2025,2/1/2025,IMF,Virtual,Competed
3,,Mrs Missing Bank,Should Skip,Local,Physical,CBS,Participant,1/1/2025,1/2/2025,CBS,CBS,Completed
`;
    const { rows, errors } = parseHistoricalCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].bankId).toBe("9672");
    expect(rows[1].bankId).toBe("0111");
    expect(rows[1].fullName).toBe("");
    expect(rows[1].completionName).toBe("Completed");
    expect(rows[1].roleName).toBe("Panelist");
    expect(errors.some((e) => e.message.includes("Bank No"))).toBe(true);
  });
});
