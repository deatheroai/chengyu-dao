import { describe, expect, it } from "vitest";
import { cardCount, cardList, cardName, withCard } from "./cards";
import { FAMILIES } from "./families";

describe("字族卡", () => {
  it("unlocks a family once, and only real families", () => {
    let r = withCard({ stamps: {} }, "qing");
    expect(r.isNew).toBe(true);
    r = withCard(r.progress, "qing");
    expect(r.isNew).toBe(false);
    expect(withCard(r.progress, "nope").isNew).toBe(false);
    expect(cardCount(r.progress)).toBe(1);
  });

  it("lists every family, unlocked or not, named by its characters", () => {
    const list = cardList({ stamps: {}, cards: ["qing"] });
    expect(list).toHaveLength(FAMILIES.length);
    expect(list.filter((c) => c.unlocked).map((c) => c.family.id)).toEqual(["qing"]);
    expect(cardName(list[0].family)).toBe("晴 睛 清 情 请");
  });
});
