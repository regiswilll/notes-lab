"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { createNoteAction, type ActionState } from "../actions";
import type { ListState } from "../list-state";
import { ListStateFields } from "./list-state-fields";

const initialState: ActionState = { status: "idle" };

const noFilter: ListState = { tags: [], q: "" };

/** listState: the sidebar's tag filter and search, kept when the new note opens. */
export function NewNoteButton({ listState = noFilter }: { listState?: ListState }) {
  const [state, formAction, pending] = useActionState(
    createNoteAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <ListStateFields state={listState} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "+ New note"}
      </Button>
      {state.status === "error" && (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
