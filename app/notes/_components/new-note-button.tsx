"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { createNoteAction, type ActionState } from "../actions";

const initialState: ActionState = { status: "idle" };

/** filter: the sidebar's tag filter, kept when the new note opens. */
export function NewNoteButton({ filter = "" }: { filter?: string }) {
  const [state, formAction, pending] = useActionState(
    createNoteAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="filter" value={filter} />
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
