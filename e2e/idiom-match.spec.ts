import { test, expect, type Page, type Locator } from "@playwright/test";
import { idiomsById } from "../src/idioms/idioms";
import { buildHintMaskedIdiom } from "../src/idiom-door/matchHintStatus";
import { splitIntoSubRounds, MILESTONE_BATCH_SIZE, MILESTONE_SUB_ROUNDS, IDIOMS_PER_SUB_ROUND } from "../src/shared/matchMilestoneHistory";
import { STARTING_MATCH_HP, WRONG_PAIR_HP_PENALTY } from "../src/idiom-door/matchHp";
import { dragMatchTile, tapMatchTile } from "./helpers/idiomMatch";
import { completeFullIdiomSession } from "./helpers/fullSession";

/**
 * 2026-09-08 ("milestone-only matching") redesign: the idiom-halves
 * matching mechanic (IdiomMatchScene/matchProgress.ts/
 * matchLevelContent.ts's `buildMatchLevel`) is no longer a per-session
 * warm-up — it only ever runs as a milestone's matching finale, once
 * `MILESTONE_BATCH_SIZE` freshly-discovered idioms are due for one
 * (shared/matchMilestoneHistory.ts's `pendingMatchMilestone`), checked
 * right when a session that crosses that threshold finishes
 * (main.ts's `advanceAfterBalloonStage`). Reaching it for real therefore
 * needs a real completed session, not just a page load — `seedFirst15`
 * below seeds `MILESTONE_BATCH_SIZE` known discovered idioms directly
 * (same "dev-only reset stands in for really waiting" idea
 * writing-stage.spec.ts's own `seedCompletedSessions` already uses),
 * then `completeFullIdiomSession` (e2e/helpers/fullSession.ts) plays one
 * whole real session for real to cross the threshold and trigger the
 * milestone. That setup is expensive (a real writing+door+balloon
 * session), so this file leans toward fewer, richer tests over many
 * small ones for it — same trade-off idiom-door.spec.ts's own "solving
 * all 3 levels..." mega-test already makes.
 */

const SEEDED_IDIOM_IDS = [
  "yi-xin-yi-yi",
  "you-shi-you-zhong",
  "ban-tu-er-fei",
  "shu-neng-sheng-qiao",
  "mo-chu-cheng-zhen",
  "ba-miao-zhu-zhang",
  "chi-zhi-yi-heng",
  "quan-shen-guan-zhu",
  "yi-si-bu-gou",
  "jing-yi-qiu-jing",
  "you-tiao-bu-wen",
  "chu-bian-bu-jing",
  "quan-li-yi-fu",
  "qie-er-bu-she",
  "fei-qin-wang-shi",
];

/** Strips ruby `<rt>` pinyin annotations from a clone, recovering just
 * the base hanzi text — same approach as idiom-door.spec.ts's
 * rubyBaseText, needed here too since the hint card's hanzi line is
 * ruby-annotated the same way. */
async function rubyBaseText(locator: Locator): Promise<string> {
  return locator.evaluate((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("rt").forEach((rt) => rt.remove());
    return clone.textContent ?? "";
  });
}

/**
 * Seeds this device with one fake prior completed session covering
 * exactly `SEEDED_IDIOM_IDS` (`MILESTONE_BATCH_SIZE` of them, a known,
 * fixed set of real idiom ids rather than whatever today's real
 * rotation happens to draw) as already-discovered — same storage shape
 * `recordCompletedSession` itself writes. `allDiscoveredIdiomIds`
 * preserves first-discovered order from a `Set` built by iterating
 * completed sessions in order, so seeding this as the device's *only*
 * (and therefore earliest) session guarantees milestone 1 is exactly
 * this list, in this order — regardless of whether the real session
 * `completeFullIdiomSession` plays afterward happens to overlap it (its
 * own idioms are deduplicated in, appended *after*, so they can only
 * ever land in milestone 2's slice, never milestone 1's).
 */
async function seedFirst15(page: Page): Promise<void> {
  await page.goto("/idiom-door.html");
  await page.evaluate((idiomIds) => {
    localStorage.setItem(
      "idiom-session-history",
      JSON.stringify({
        completedSessions: [{ idiomIds, completedAt: Date.now() - 86_400_000 }],
      }),
    );
  }, SEEDED_IDIOM_IDS);
  await page.reload();
  await expect(page.locator("#resurface-card")).toHaveClass(/visible/);
  await page.click("#resurface-continue-btn");
  await expect(page.locator("#level-intro-card")).toHaveClass(/visible/);
}

test("a fresh session that crosses 15 discovered idioms triggers the milestone finale — intro, 3 sub-rounds (with a wrong pair and a hint along the way), and the final card, before the plain session summary", async ({ page }) => {
  test.setTimeout(600000);
  expect(SEEDED_IDIOM_IDS).toHaveLength(MILESTONE_BATCH_SIZE);

  await seedFirst15(page);
  await completeFullIdiomSession(page);

  // The matching finale — not the plain session summary — is the very
  // next thing shown, per BACKLOG.md's "milestone-only matching" entry:
  // it's the session's actual finale.
  const milestoneIntro = page.locator("#milestone-intro-card");
  await expect(milestoneIntro).toHaveClass(/visible/, { timeout: 70000 });
  await expect(milestoneIntro.locator("[data-milestone-intro-count]")).toHaveText(String(MILESTONE_BATCH_SIZE));
  await expect(page.locator("#session-summary-card")).not.toBeVisible();

  await page.click("#start-milestone-btn");
  await expect(milestoneIntro).not.toHaveClass(/visible/);
  await expect(page.locator("#match-ui-layer")).not.toHaveClass(/stage-hidden/);

  const subRounds = splitIntoSubRounds(SEEDED_IDIOM_IDS);
  expect(subRounds).toHaveLength(MILESTONE_SUB_ROUNDS);

  let expectedHp = STARTING_MATCH_HP;

  // --- Round 1: a hint tap, a deliberate wrong pair (HP penalty, then
  // revert), then every real pair. ---
  const round1 = subRounds[0];
  await expect(page.locator("[data-milestone-round-fraction]")).toHaveText("Round 1/3");
  await expect(page.locator("#match-status")).toHaveText(`0 of ${IDIOMS_PER_SUB_ROUND} joined`);
  await expect(page.locator("#match-hp")).toHaveText(`❤️ ${expectedHp}`);

  // A plain tap (not drag) on a first-half tile shows its hint, and
  // costs nothing.
  const [hintIdiomId] = round1;
  const hintIdiom = idiomsById[hintIdiomId];
  const { hanzi: hintHanzi } = buildHintMaskedIdiom(hintIdiom);
  await tapMatchTile(page, `${hintIdiomId}-first`);
  const hintCard = page.locator("#match-hint-card");
  await expect(hintCard).toHaveClass(/visible/);
  await expect.poll(() => rubyBaseText(hintCard.locator("[data-hint-hanzi]"))).toBe(hintHanzi);
  await expect(hintCard.locator("[data-hint-meaning]")).toHaveText(hintIdiom.meaning);
  await page.click("#match-hint-dismiss-btn");
  await expect(hintCard).not.toHaveClass(/visible/);
  await expect(page.locator("#match-hp")).toHaveText(`❤️ ${expectedHp}`);

  // A deliberate wrong pair — two different idioms' halves — costs
  // WRONG_PAIR_HP_PENALTY and flashes wrong, then reverts.
  const [idiomA, idiomB] = round1;
  await dragMatchTile(page, `${idiomA}-first`, `${idiomB}-second`);
  await expect(page.locator("#match-status")).toHaveAttribute("data-outcome", "wrong");
  expectedHp -= WRONG_PAIR_HP_PENALTY;
  await expect(page.locator("#match-hp")).toHaveText(`❤️ ${expectedHp}`);
  await page.waitForTimeout(700); // outlasts IdiomMatchScene's WRONG_REVERT_MS

  for (const idiomId of round1) {
    await dragMatchTile(page, `${idiomId}-first`, `${idiomId}-second`);
  }
  await expect(page.locator("#match-status")).toHaveAttribute("data-complete", "true");

  // --- Round-progress card between sub-rounds — the "child can see
  // their progress after each stage" beat. ---
  const roundCard = page.locator("#milestone-round-card");
  await expect(roundCard).toHaveClass(/visible/, { timeout: 5000 });
  await expect(roundCard.locator("[data-milestone-round-headline]")).toHaveText("Round 1 of 3 done!");
  await expect(roundCard.locator("[data-milestone-round-hp]")).toHaveText(`❤️ ${expectedHp} HP so far`);
  await page.click("#milestone-round-continue-btn");
  await expect(roundCard).not.toHaveClass(/visible/);

  // --- Round 2: every pair correct — HP carries over unchanged from
  // round 1, not reset to STARTING_MATCH_HP. ---
  await expect(page.locator("[data-milestone-round-fraction]")).toHaveText("Round 2/3");
  await expect(page.locator("#match-hp")).toHaveText(`❤️ ${expectedHp}`);
  for (const idiomId of subRounds[1]) {
    await dragMatchTile(page, `${idiomId}-first`, `${idiomId}-second`);
  }
  await expect(page.locator("#match-status")).toHaveAttribute("data-complete", "true");
  await expect(roundCard).toHaveClass(/visible/, { timeout: 5000 });
  await expect(roundCard.locator("[data-milestone-round-headline]")).toHaveText("Round 2 of 3 done!");
  await expect(roundCard.locator("[data-milestone-round-hp]")).toHaveText(`❤️ ${expectedHp} HP so far`);
  await page.click("#milestone-round-continue-btn");

  // --- Round 3 (the last one): every pair correct, then straight to the
  // final card (no round-progress interstitial after the last round). ---
  await expect(page.locator("[data-milestone-round-fraction]")).toHaveText("Round 3/3");
  for (const idiomId of subRounds[2]) {
    await dragMatchTile(page, `${idiomId}-first`, `${idiomId}-second`);
  }
  await expect(page.locator("#match-status")).toHaveAttribute("data-complete", "true");

  // --- The milestone's final card: this milestone's own final HP, and
  // — since this is the very first milestone, nothing to compare
  // against yet — no personal-best or trend line. ---
  const finalCard = page.locator("#milestone-final-card");
  await expect(finalCard).toHaveClass(/visible/, { timeout: 5000 });
  await expect(finalCard.locator("[data-milestone-final-eyebrow]")).toHaveText("🏆 Milestone 1 complete!");
  await expect(finalCard.locator("[data-milestone-final-hp]")).toHaveText(`❤️ ${expectedHp} HP`);
  await expect(finalCard.locator("[data-milestone-final-trend]")).toHaveText("");
  await expect(finalCard.locator("[data-milestone-final-best]")).toHaveText("");

  await page.click("#milestone-final-continue-btn");
  await expect(finalCard).not.toHaveClass(/visible/);

  // Finally, the plain session summary — the milestone finale ran
  // *before* it, per this test's own top assertion, not instead of it.
  await expect(page.locator("#session-summary-card")).toBeVisible();
});

// A fresh, unseeded session (this suite's other test's own starting
// state before it seeds anything) never crosses 15 discovered idioms
// on its own — idiom-door.spec.ts's "solving all 3 levels..." test
// already exercises that exact path end to end (straight to
// #session-summary-card, no milestone card ever appearing, or that
// test would hang waiting on it) — not repeated here as its own
// (expensive) test.
