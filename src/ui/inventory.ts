const ITEM_LABELS: Record<string, string> = {
  "iron-key": "🗝 Iron Key",
};

export function renderInventory(items: string[]): void {
  const bar = document.getElementById("inventory-bar");
  if (!bar) return;

  bar.innerHTML = "";
  for (const item of items) {
    const el = document.createElement("div");
    el.className = "inventory-item";
    el.textContent = ITEM_LABELS[item] ?? item;
    bar.appendChild(el);
  }
}

export function showClueText(text: string): void {
  const el = document.getElementById("clue-text");
  if (el) el.textContent = text;
}
