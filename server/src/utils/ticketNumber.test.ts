import { describe, it, expect } from "vitest";
import { generateTicketNumber } from "./ticketNumber";

describe("generateTicketNumber", () => {
  it("pads the sequence number to 6 digits", () => {
    expect(generateTicketNumber(123, 2026)).toBe("TKT-2026-000123");
  });

  it("does not truncate a sequence number that already has 6+ digits", () => {
    expect(generateTicketNumber(123456, 2026)).toBe("TKT-2026-123456");
  });

  it("defaults to the current year when none is given", () => {
    const currentYear = new Date().getFullYear();
    expect(generateTicketNumber(1)).toBe(`TKT-${currentYear}-000001`);
  });
});