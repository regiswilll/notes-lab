import type { ListState } from "../list-state";

/**
 * Hidden form fields carrying the sidebar's tag filter and search text, so the
 * Server Action can redirect back to the same filtered list.
 */
export function ListStateFields({ state }: { state: ListState }) {
  return (
    <>
      <input type="hidden" name="filter" value={state.tags.join(",")} />
      <input type="hidden" name="q" value={state.q} />
    </>
  );
}
