// What the sidebar list is narrowed to: the tag filter and the search text.
// Both live in the URL (/notes?tags=1,3&q=plan), so a reload keeps them, and
// forms send them along (hidden "filter" and "q" fields) so a redirect after
// Save, Delete, New note or Cancel keeps them too.
// Shared by the page, the Server Actions and the client components.

export type ListState = {
  /** Selected tag ids, e.g. [1, 3]. */
  tags: number[];
  /** Search text ("" = no search). */
  q: string;
};

export const MAX_SEARCH = 100;

/** /notes with an open note, a "saved" message, the tags list, and the list state. */
export function notesHref(
  options: { id?: number | null; saved?: number | null; view?: "tags" } & Partial<ListState>,
): string {
  const parts: string[] = [];
  if (options.id) parts.push(`id=${options.id}`);
  if (options.saved) parts.push(`saved=${options.saved}`);
  if (options.tags && options.tags.length > 0) {
    parts.push(`tags=${[...options.tags].sort((a, b) => a - b).join(",")}`);
  }
  if (options.q) parts.push(`q=${encodeURIComponent(options.q)}`);
  if (options.view) parts.push(`view=${options.view}`);
  return parts.length ? `/notes?${parts.join("&")}` : "/notes";
}

/** "1,3" -> [1, 3]; anything that isn't an id is skipped. */
export function parseTagIds(value: unknown): number[] {
  const text = Array.isArray(value) ? value[0] : value;
  const ids = String(text ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  return [...new Set(ids)];
}

/** Search text from the URL or a form: trimmed, capped in length. */
export function parseSearch(value: unknown): string {
  const text = Array.isArray(value) ? value[0] : value;
  return String(text ?? "").trim().slice(0, MAX_SEARCH);
}
