"use client";

import type { Collection } from "@/lib/db";

/**
 * Dropdown in the editor for the note's collection. It is part of the Save
 * form (name="collection_id"): picking a collection is an unsaved change,
 * stored when Save is pressed and dropped on Cancel.
 */
export function CollectionPicker({
  noteId,
  value,
  onChange,
  collections,
}: {
  noteId: number;
  /** Selected collection id, or null for "No collection". */
  value: number | null;
  onChange: (collectionId: number | null) => void;
  collections: Collection[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label htmlFor={`collection-${noteId}`} className="text-muted-foreground">
        Collection
      </label>
      <select
        id={`collection-${noteId}`}
        name="collection_id"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="h-9 min-w-0 max-w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">No collection</option>
        {collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
