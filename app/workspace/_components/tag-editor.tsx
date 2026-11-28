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
  // The suggestions list: whether it is open, and the highlighted option
  // (-1 = none, so Enter adds the typed text).
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
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

  /** Adds an existing tag picked from the suggestions. */
  function pick(tag: Tag) {
    onChange([...value, tag.name]);
    setDraft("");
    setHint(null);
    setActive(-1);
  }

  // Suggestions: existing tags not on the note yet, matching the typed text.
  const typedKey = draft.replaceAll(",", " ").trim().toLowerCase();
  const suggestions = allTags.filter(
    (t) => !has(t.name) && t.name.toLowerCase().includes(typedKey),
  );
  const exactMatch = suggestions.some((t) => t.name.toLowerCase() === typedKey);
  // Show the list while the box has focus and there is something to show:
  // matching tags, or a note that Enter will create a new tag.
  const showList = open && (suggestions.length > 0 || typedKey !== "");
  // A saved tag shows its colour; a tag that doesn't exist yet stays neutral
  // until Save creates it (and gives it a colour).
  const colorOf = (name: string) =>
    allTags.find((t) => t.name.toLowerCase() === name.toLowerCase())?.color;
  const listId = `tag-suggestions-${noteId}`;
  const optionId = (i: number) => `${listId}-option-${i}`;

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
      {/*
        The box, the Add button and the suggestions list share one positioned
        wrapper, so the list always opens right under the box (a native
        <datalist> popup is placed by the browser and can land in the wrong
        spot inside the scrolling main area).
      */}
      <div className="relative flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setHint(null);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setOpen(false);
            setActive(-1);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              if (suggestions.length === 0) return;
              e.preventDefault();
              setOpen(true);
              const step = e.key === "ArrowDown" ? 1 : -1;
              // Wraps around; -1 (nothing highlighted) sits between last and first.
              setActive((i) => {
                const n = suggestions.length + 1;
                return ((i + 1 + step + n) % n) - 1;
              });
              return;
            }
            if (e.key === "Escape" && showList) {
              e.preventDefault();
              setOpen(false);
              setActive(-1);
              return;
            }
            // Enter picks the highlighted suggestion; otherwise Enter or comma
            // adds the typed text. preventDefault: Enter must not submit the
            // Save form, and the comma shouldn't end up in the box.
            if (e.key === "Enter" && showList && active >= 0 && suggestions[active]) {
              e.preventDefault();
              pick(suggestions[active]);
              return;
            }
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          placeholder="Add a tag…"
          aria-label="Add a tag"
          autoComplete="off"
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

        {showList && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            <ul
              id={listId}
              role="listbox"
              aria-label="Existing tags"
              className="max-h-56 overflow-y-auto"
            >
              {suggestions.map((t, i) => (
                <li
                  key={t.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  title={t.name}
                  // mousedown would blur the box and close the list before the
                  // click lands; keep the focus in the box instead.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(t)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "cursor-pointer rounded-sm px-1.5 py-1",
                    i === active && "bg-accent text-accent-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block max-w-full truncate rounded-full px-2 py-0.5 align-middle text-xs",
                      tagPillClass(t.color),
                    )}
                  >
                    {t.name}
                  </span>
                </li>
              ))}
            </ul>
            {/* Nothing matches (or only a near match): say what Enter will do. */}
            {typedKey !== "" && !exactMatch && (
              <p className="px-1.5 py-1 text-xs text-muted-foreground">
                {has(typedKey)
                  ? "Already on this note."
                  : suggestions.length === 0
                    ? "No existing tag matches. Press Enter to add it as a new tag."
                    : "Press Enter to add it as a new tag."}
              </p>
            )}
          </div>
        )}
      </div>
      {hint && (
        <span role="status" className="text-xs text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  );
}
