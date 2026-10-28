import { describe, it, expect } from "vitest";
import { validateActionInput, validateActionResult } from "./actionValidation";

const NOW = new Date("2026-10-20T08:00:00.000Z");

describe("Lab 4 — UNIT-03 action input validation (L4-BR-05/06)", () => {
  it("accepts a minimal valid payload and applies defaults", () => {
    const { errors, value } = validateActionInput({ description: "  Replaced cable  " }, NOW);
    expect(errors).toEqual({});
    expect(value.description).toBe("Replaced cable");
    expect(value.actionAt.toISOString()).toBe(NOW.toISOString());
    expect(value.followUpRequired).toBe(false);
    expect(value.followUpNote).toBeNull();
    expect(value.attachmentNotes).toBeNull();
    expect(value.assigneeId).toBeUndefined();
  });

  it("rejects a missing or too short description (trimmed)", () => {
    expect(validateActionInput({}, NOW).errors.description).toBeDefined();
    expect(validateActionInput({ description: "  ab  " }, NOW).errors.description).toBeDefined();
    expect(validateActionInput({ description: 42 }, NOW).errors.description).toBeDefined();
  });

  it("rejects a description over 1000 characters", () => {
    expect(validateActionInput({ description: "x".repeat(1001) }, NOW).errors.description).toBeDefined();
    expect(validateActionInput({ description: "x".repeat(1000) }, NOW).errors.description).toBeUndefined();
  });

  it("requires a follow-up note (3-500) when follow-up is required", () => {
    expect(validateActionInput({ description: "Valid text", followUpRequired: true }, NOW).errors.followUpNote).toBeDefined();
    expect(
      validateActionInput({ description: "Valid text", followUpRequired: true, followUpNote: " a " }, NOW).errors.followUpNote
    ).toBeDefined();
    expect(
      validateActionInput({ description: "Valid text", followUpRequired: true, followUpNote: "x".repeat(501) }, NOW).errors
        .followUpNote
    ).toBeDefined();
    const ok = validateActionInput({ description: "Valid text", followUpRequired: true, followUpNote: "Call back Friday" }, NOW);
    expect(ok.errors).toEqual({});
    expect(ok.value.followUpNote).toBe("Call back Friday");
  });

  it("stores followUpNote as null when follow-up is not required", () => {
    const { errors, value } = validateActionInput(
      { description: "Valid text", followUpRequired: false, followUpNote: "ignored note" },
      NOW
    );
    expect(errors).toEqual({});
    expect(value.followUpNote).toBeNull();
  });

  it("rejects a non-boolean followUpRequired", () => {
    expect(validateActionInput({ description: "Valid text", followUpRequired: "yes" }, NOW).errors.followUpRequired).toBeDefined();
  });

  it("rejects attachmentNotes over 500 characters", () => {
    expect(validateActionInput({ description: "Valid text", attachmentNotes: "x".repeat(501) }, NOW).errors.attachmentNotes).toBeDefined();
    expect(validateActionInput({ description: "Valid text", attachmentNotes: "x".repeat(500) }, NOW).errors.attachmentNotes).toBeUndefined();
  });

  it("rejects an invalid or out-of-range actionAt (1 year ahead / 5 years back)", () => {
    expect(validateActionInput({ description: "Valid text", actionAt: "not-a-date" }, NOW).errors.actionAt).toBeDefined();
    expect(validateActionInput({ description: "Valid text", actionAt: "2028-01-01T00:00:00Z" }, NOW).errors.actionAt).toBeDefined();
    expect(validateActionInput({ description: "Valid text", actionAt: "2020-01-01T00:00:00Z" }, NOW).errors.actionAt).toBeDefined();
    expect(validateActionInput({ description: "Valid text", actionAt: "2026-11-01T09:00:00Z" }, NOW).errors.actionAt).toBeUndefined();
  });

  it("rejects a non-integer assigneeId", () => {
    expect(validateActionInput({ description: "Valid text", assigneeId: "abc" }, NOW).errors.assigneeId).toBeDefined();
    expect(validateActionInput({ description: "Valid text", assigneeId: 1.5 }, NOW).errors.assigneeId).toBeDefined();
    expect(validateActionInput({ description: "Valid text", assigneeId: 7 }, NOW).value.assigneeId).toBe(7);
  });

  it("validates the completion result (required, 1-1000, trimmed)", () => {
    expect(validateActionResult(undefined)).toBeDefined();
    expect(validateActionResult("   ")).toBeDefined();
    expect(validateActionResult("x".repeat(1001))).toBeDefined();
    expect(validateActionResult(" Fixed ")).toBeUndefined();
  });
});
