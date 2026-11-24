"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { createNoteAction, type ActionState } from "../actions";

const initialState: ActionState = { status: "idle" };

export function NewNoteButton() {
  const [state, formAction, pending] = useActionState(
    createNoteAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
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
