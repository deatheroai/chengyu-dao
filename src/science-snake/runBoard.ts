import { buildRunBoard, loadRecentRuns, type RunBoardRow } from "./scienceSnakeScore";

/**
 * The runs board on the start, win and game-over cards (per "a board
 * showing the last four runs and the questions answered correctly,
 * apples eaten and golden apples eaten categories to encourage the
 * child to keep improving"): one row per run, newest first, and a green
 * ▲ on every number that beat the run before it.
 */

const COLUMNS: { key: keyof RunBoardRow["up"]; label: string; title: string }[] = [
  { key: "score", label: "⭐ Points", title: "Points" },
  { key: "correct", label: "🔬 Right", title: "Questions answered right" },
  { key: "apples", label: "🍎 Apples", title: "Apples eaten" },
  { key: "golden", label: "✨ Golden", title: "Golden apples eaten" },
];

const ROW_LABELS = ["Latest", "1 before", "2 before", "3 before"];

function cell(tag: "td" | "th", text: string, className?: string): HTMLElement {
  const el = document.createElement(tag);
  el.textContent = text;
  if (className) el.className = className;
  return el;
}

function renderInto(container: HTMLElement, rows: RunBoardRow[]): void {
  container.classList.toggle("hidden", rows.length === 0);
  if (!rows.length) {
    container.replaceChildren();
    return;
  }
  const table = document.createElement("table");
  const head = document.createElement("tr");
  head.append(cell("th", ""), ...COLUMNS.map((c) => Object.assign(cell("th", c.label), { title: c.title })));
  table.append(head);
  rows.forEach((row, i) => {
    const tr = document.createElement("tr");
    if (i === 0) tr.className = "latest";
    tr.append(
      cell("th", ROW_LABELS[i] ?? ""),
      ...COLUMNS.map((c) => {
        const td = cell("td", String(row[c.key]));
        if (row.up[c.key]) {
          td.classList.add("up");
          const arrow = document.createElement("span");
          arrow.className = "up-arrow";
          arrow.textContent = "▲";
          td.append(" ", arrow);
        }
        return td;
      }),
    );
    table.append(tr);
  });
  const caption = document.createElement("p");
  caption.className = "run-board-tip";
  caption.textContent = rows.length > 1 ? "▲ = better than the run before. Beat your latest run!" : "Play again to see if you can beat it!";
  container.replaceChildren(table, caption);
}

/** Redraws every runs board on the page from the stored runs. */
export function renderRunBoards(): void {
  const rows = buildRunBoard(loadRecentRuns());
  for (const el of document.querySelectorAll<HTMLElement>("[data-run-board]")) renderInto(el, rows);
}
