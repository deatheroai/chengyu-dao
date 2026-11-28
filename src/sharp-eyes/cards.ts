import { FAMILIES, type Family } from "./families";
import type { Progress } from "./progress";

/**
 * 字族卡: one card per character family. Fixing a mistake unlocks its
 * family's card (晴/睛 → the 青 family), so she builds a collection.
 */

export const hasCard = (p: Progress, familyId: string): boolean => (p.cards ?? []).includes(familyId);

/** Unlocks the card; `isNew` the first time. */
export function withCard(p: Progress, familyId: string): { progress: Progress; isNew: boolean } {
  if (hasCard(p, familyId) || !FAMILIES.some((f) => f.id === familyId)) return { progress: p, isNew: false };
  return { progress: { ...p, cards: [...(p.cards ?? []), familyId] }, isNew: true };
}

/** All cards in level order, unlocked or not. */
export const cardList = (p: Progress): { family: Family; unlocked: boolean }[] =>
  FAMILIES.map((family) => ({ family, unlocked: hasCard(p, family.id) }));

export const cardCount = (p: Progress): number => (p.cards ?? []).filter((id) => FAMILIES.some((f) => f.id === id)).length;

/** The characters on a card, as its name: 晴 睛 清 情 请. */
export const cardName = (f: Family): string => f.chars.map((c) => c.char).join(" ");
