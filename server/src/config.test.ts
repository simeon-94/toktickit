import { describe, it, expect } from "vitest";
import { validateEnv } from "./config";

describe("Lab 4 — HARD-04 startup environment validation", () => {
  it("accepts a secret and a valid JWT_EXPIRES_IN (or none, which defaults to 8h)", () => {
    expect(validateEnv({ JWT_SECRET: "s", JWT_EXPIRES_IN: "8h" })).toEqual([]);
    expect(validateEnv({ JWT_SECRET: "s", JWT_EXPIRES_IN: "30m" })).toEqual([]);
    expect(validateEnv({ JWT_SECRET: "s", JWT_EXPIRES_IN: "2 days" })).toEqual([]);
    expect(validateEnv({ JWT_SECRET: "s" })).toEqual([]);
  });

  it("rejects a missing JWT_SECRET and an unparseable JWT_EXPIRES_IN", () => {
    expect(validateEnv({ JWT_EXPIRES_IN: "8h" })).toEqual(["JWT_SECRET is required."]);
    const errors = validateEnv({ JWT_SECRET: "s", JWT_EXPIRES_IN: "eight hours" });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("JWT_EXPIRES_IN");
    expect(validateEnv({ JWT_SECRET: "s", JWT_EXPIRES_IN: "-5" })).toHaveLength(1);
    // jsonwebtoken reads a unit-less string as milliseconds ("3600" = 3.6 s), so a unit is required.
    expect(validateEnv({ JWT_SECRET: "s", JWT_EXPIRES_IN: "3600" })).toHaveLength(1);
    expect(validateEnv({ JWT_SECRET: "s", JWT_EXPIRES_IN: "" })).toHaveLength(1);
  });
});
