import { describe, expect, it } from "vitest";

import ru from "../../messages/ru.json";
import uz from "../../messages/uz.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("messages", () => {
  it("uz va ru kalitlari bir xil", () => {
    expect(keys(ru).sort()).toEqual(keys(uz).sort());
  });

  it("bo'sh tarjima yo'q", () => {
    for (const [name, msgs] of Object.entries({ uz, ru })) {
      for (const key of keys(msgs)) {
        const value = key
          .split(".")
          .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], msgs);
        expect(value, `${name}:${key}`).not.toBe("");
      }
    }
  });
});
