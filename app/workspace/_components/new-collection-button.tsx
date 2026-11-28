"use client";

import { FolderPlus } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCollectionAction, type ActionState } from "../actions";

const initialState: ActionState = { status: "idle" };

/**
 * "New collection" button. Clicking it shows a name field; "Add" creates the
 * collection at once and the sidebar shows it as a new (empty) group.
 */
export function NewCollectionButton() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <FolderPlus />
        New collection
      </Button>
    );
  }
  // Mounted only while open, so an old error is cleared the next time.
  return <NewCollectionForm onClose={() => setOpen(false)} />;
}

function NewCollectionForm({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await createCollectionAction(prev, formData);
      if (result.status === "success") onClose();
      return result;
    },
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <Input
        name="name"
        placeholder="Collection name"
        aria-label="Collection name"
        required
        maxLength={100}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" size="sm" className="flex-1" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      {state.status === "error" && (
        <p role="alert" className="text-xs text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
