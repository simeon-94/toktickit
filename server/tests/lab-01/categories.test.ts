import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("GET /api/categories", () => {
  it("returns the four seeded categories in a predictable order", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const names = res.body.map((c: { name: string }) => c.name);
    expect(names).toEqual(
      expect.arrayContaining(["Account and Access", "Hardware", "Software", "Network"])
    );

    for (const category of res.body) {
      expect(category).toHaveProperty("id");
      expect(category).toHaveProperty("name");
    }
  });
});
