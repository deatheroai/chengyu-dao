import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { showCloudSaveCard, hideCloudSaveCard, handleCopyCode, handleRestoreFromCode } from "./cloudSaveStatus";
import { recordCompletedSession, allDiscoveredIdiomIds } from "../shared/sessionHistory";

function mountCard(): void {
  document.body.innerHTML = `
    <div id="cloud-save-card">
      <span data-cloud-code></span>
      <span data-cloud-status></span>
    </div>
  `;
}

function stubFetch(impl: (input: string, init?: RequestInit) => Response): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: unknown, init?: RequestInit) => Promise.resolve(impl(String(input), init))),
  );
}

beforeEach(() => {
  localStorage.clear();
  mountCard();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("showCloudSaveCard", () => {
  it("reveals the card with a freshly minted code", () => {
    stubFetch(() => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    showCloudSaveCard();
    const card = document.getElementById("cloud-save-card")!;
    expect(card.classList.contains("visible")).toBe(true);
    const code = card.querySelector("[data-cloud-code]")!.textContent;
    expect(code).toHaveLength(8);
  });

  it("reuses the same code on a second open rather than minting a new one", () => {
    stubFetch(() => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    showCloudSaveCard();
    const first = document.querySelector("[data-cloud-code]")!.textContent;
    hideCloudSaveCard();
    showCloudSaveCard();
    const second = document.querySelector("[data-cloud-code]")!.textContent;
    expect(second).toBe(first);
  });

  it("reports success once the best-effort push resolves", async () => {
    stubFetch(() => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    showCloudSaveCard();
    await vi.waitFor(() => {
      expect(document.querySelector("[data-cloud-status]")!.textContent).toContain("Saved to the cloud");
    });
  });

  it("surfaces a not-configured message rather than a raw failure", async () => {
    stubFetch(() => new Response(JSON.stringify({ error: "not-configured" }), { status: 501 }));
    showCloudSaveCard();
    await vi.waitFor(() => {
      expect(document.querySelector("[data-cloud-status]")!.textContent).toMatch(/isn't set up/);
    });
  });

  it("appends the server's own error to the message on an unexpected failure, so it isn't mistaken for being offline", async () => {
    stubFetch(() => new Response(JSON.stringify({ error: "redis timeout" }), { status: 500 }));
    showCloudSaveCard();
    await vi.waitFor(() => {
      expect(document.querySelector("[data-cloud-status]")!.textContent).toBe(
        "Couldn't reach the cloud save server. Check your connection and try again. (HTTP 500: redis timeout)",
      );
    });
  });
});

describe("hideCloudSaveCard", () => {
  it("removes the visible class", () => {
    document.getElementById("cloud-save-card")!.classList.add("visible");
    hideCloudSaveCard();
    expect(document.getElementById("cloud-save-card")!.classList.contains("visible")).toBe(false);
  });
});

describe("handleCopyCode", () => {
  it("copies the currently-shown code via the Clipboard API", async () => {
    document.querySelector("[data-cloud-code]")!.textContent = "234567AB";
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    await handleCopyCode();
    expect(writeText).toHaveBeenCalledWith("234567AB");
    expect(document.querySelector("[data-cloud-status]")!.textContent).toBe("Code copied!");
  });
});

describe("handleRestoreFromCode", () => {
  it("rejects a malformed code without calling the network", async () => {
    stubFetch(() => {
      throw new Error("should not be called");
    });
    await handleRestoreFromCode("not a code");
    expect(document.querySelector("[data-cloud-status]")!.textContent).toMatch(/doesn't look like a save code/);
  });

  it("shows a not-found message for a code with nothing saved under it", async () => {
    stubFetch(() => new Response(JSON.stringify({ error: "not-found" }), { status: 404 }));
    await handleRestoreFromCode("234567AB");
    expect(document.querySelector("[data-cloud-status]")!.textContent).toMatch(/No save found/);
  });

  it("normalizes a lowercase/whitespace-padded code before validating", async () => {
    let requestedUrl = "";
    stubFetch((url) => {
      requestedUrl = url;
      return new Response(JSON.stringify({ error: "not-found" }), { status: 404 });
    });
    await handleRestoreFromCode("  234567ab  ");
    expect(requestedUrl).toBe("/api/cloud-save?code=234567AB");
  });

  it("merges the fetched history into local storage and reloads on success", async () => {
    recordCompletedSession(["local-only"], 1);
    stubFetch(
      () =>
        new Response(
          JSON.stringify({ ok: true, data: { completedSessions: [{ idiomIds: ["from-cloud"], completedAt: 2 }] } }),
          { status: 200 },
        ),
    );
    const reloadSpy = vi.fn();
    // jsdom's location.reload throws "not implemented" unless stubbed.
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
    });
    await handleRestoreFromCode("234567AB");
    expect(new Set(allDiscoveredIdiomIds())).toEqual(new Set(["local-only", "from-cloud"]));
    expect(reloadSpy).toHaveBeenCalled();
  });
});
