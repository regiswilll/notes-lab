"use client";

import { X } from "lucide-react";
import { useState } from "react";

import type { Tag } from "@/lib/db";
import { tagPillClass } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

const MAX_TAG_NAME = 50;

/**
 * Tags in the note editor: chips with a small x to remove, and a box to type a
 * new one (Enter or comma adds it; existing tags are suggested). Part of the
 * Save form: each chip is sent as a hidden "tag" field, so tag changes are
 * stored by Save and dropped by Cancel, like the title and body.
 * Text typed in the box but not yet added also counts as a change: it is sent
 * with Save too, so nothing typed is lost.
 */
export function TagEditor({
  noteId,
  value,
  onChange,
  draft,
  onDraftChange,
  allTags,
}: {
  noteId: number;
  /** The note's tag names in the editor (may include unsaved ones). */
  value: string[];
  onChange: (names: string[]) => void;
  /** Text in the "Add a tag" box (held by the editor, so it can enable Save). */
  draft: string;
  onDraftChange: (text: string) => void;
  /** Every existing tag, for suggestions and to reuse their spelling. */
  allTags: Tag[];
}) {
  const setDraft = onDraftChange;
  const [hint, setHint] = useState<string | null>(null);
  const has = (name: string) => value.some((t) => t.toLowerCase() === name.toLowerCase());

  function add() {
    const typed = draft.replaceAll(",", " ").trim();
    if (typed === "") return;
    if (typed.length > MAX_TAG_NAME) {
      setHint(`Keep a tag to ${MAX_TAG_NAME} characters or fewer.`);
      return;
    }
    if (has(typed)) {
      setHint(`"${typed}" is already on this note.`);
      setDraft("");
      return;
    }
    // Reuse an existing tag's spelling ("work" -> "Work") so no near-duplicate is made.
    const existing = allTags.find((t) => t.name.toLowerCase() === typed.toLowerCase());
    onChange([...value, existing?.name ?? typed]);
    setDraft("");
    setHint(null);
  }

  const suggestions = allTags.filter((t) => !has(t.name));
  // A saved tag shows its colour; a tag that doesn't exist yet stays neutral
  // until Save creates it (and gives it a colour).
  const colorOf = (name: string) =>
    allTags.find((t) => t.name.toLowerCase() === name.toLowerCase())?.color;
  const listId = `tag-suggestions-${noteId}`;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground" id={`tags-label-${noteId}`}>
        Tags
      </span>
      {value.length === 0 && <span className="text-xs text-muted-foreground">No tags yet.</span>}
      <ul className="contents" aria-labelledby={`tags-label-${noteId}`}>
        {value.map((name) => (
          <li
            key={name.toLowerCase()}
            className={cn(
              "inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-xs",
              tagPillClass(colorOf(name)),
            )}
          >
            {name}
            <input type="hidden" name="tag" value={name} />
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== name))}
              aria-label={`Remove tag "${name}"`}
              title="Remove tag"
              className="flex h-4 w-4 items-center justify-center rounded-full opacity-70 hover:bg-black/10 hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:hover:bg-white/15"
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      {/* Typed but not added yet: still saved by Save. */}
      {draft.trim() !== "" && <input type="hidden" name="tag" value={draft.replaceAll(",", " ").trim()} />}
      <input
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setHint(null);
        }}
        onKeyDown={(e) => {
          // Enter or comma adds the tag. preventDefault: Enter must not submit
          // the Save form, and the comma shouldn't end up in the box.
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        list={listId}
        placeholder="Add a tag…"
        aria-label="Add a tag"
        maxLength={MAX_TAG_NAME + 1}
        className="h-8 w-36 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={add}
        disabled={draft.trim() === ""}
        className="h-8 rounded-md border border-input px-2 text-xs shadow-sm hover:bg-accent disabled:opacity-50"
      >
        Add
      </button>
      <datalist id={listId}>
        {suggestions.map((t) => (
          <option key={t.id} value={t.name} />
        ))}
      </datalist>
      {hint && (
        <span role="status" className="text-xs text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}
