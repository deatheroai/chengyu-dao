import { describe, it, expect, beforeEach } from "vitest";
import { renderInventory, showClueText } from "./inventory";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="inventory-bar"></div>
    <div id="clue-text"></div>
  `;
});

describe("renderInventory", () => {
  it("renders one element per item with a known label", () => {
    renderInventory(["iron-key"]);
    const bar = document.getElementById("inventory-bar")!;
    expect(bar.children).toHaveLength(1);
    expect(bar.textContent).toContain("Iron Key");
  });

  it("falls back to the raw id for unknown items", () => {
    renderInventory(["mystery-orb"]);
    expect(document.getElementById("inventory-bar")!.textContent).toContain("mystery-orb");
  });

  it("clears previously rendered items on re-render", () => {
    renderInventory(["iron-key"]);
    renderInventory([]);
    expect(document.getElementById("inventory-bar")!.children).toHaveLength(0);
  });

  it("does nothing if the inventory bar element is missing", () => {
    document.body.innerHTML = "";
    expect(() => renderInventory(["iron-key"])).not.toThrow();
  });
});

describe("showClueText", () => {
  it("sets the clue text content", () => {
    showClueText("Hello");
    expect(document.getElementById("clue-text")!.textContent).toBe("Hello");
  });
});
