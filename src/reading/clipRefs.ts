/**
 * hanzi-writer clips each stroke with `clip-path: url("<full page URL>#mask-N")`,
 * baking in the page URL at the moment it draws. If the URL changes
 * afterwards (Vercel preview links tidy their query string after
 * loading), Safari treats that as a reference to another document and
 * drops the clip, so strokes show as thick unclipped blobs. Rewriting
 * each reference to the same-document form `url(#mask-N)` works in
 * every browser.
 */
export function relativeClipRef(value: string): string | null {
  if (value.startsWith("url(#")) return null;
  const m = value.match(/#([^"')]+)["']?\)$/);
  return m ? `url(#${m[1]})` : null;
}

export function keepClipRefsRelative(el: HTMLElement): void {
  const fix = () => {
    for (const node of el.querySelectorAll("[clip-path]")) {
      const fixed = relativeClipRef(node.getAttribute("clip-path") ?? "");
      if (fixed) node.setAttribute("clip-path", fixed);
    }
  };
  new MutationObserver(fix).observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ["clip-path"] });
  fix();
}
