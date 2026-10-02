import { describe, expect, it } from "vitest";

import { MIN_PASSWORD_LENGTH, generateTempPassword } from "./password";

describe("generateTempPassword", () => {
  it("uzunlik, alifbo va raqam", () => {
    for (let i = 0; i < 200; i++) {
      const p = generateTempPassword();
      expect(p).toHaveLength(10);
      expect(p.length).toBeGreaterThanOrEqual(MIN_PASSWORD_LENGTH);
      expect(p).toMatch(/^[a-km-zA-HJ-NP-Z2-9]+$/);
      expect(p).toMatch(/\d/);
    }
  });

  it("har safar boshqacha", () => {
    const set = new Set(Array.from({ length: 50 }, () => generateTempPassword()));
    expect(set.size).toBe(50);
  });
});
