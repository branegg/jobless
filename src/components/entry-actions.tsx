"use client";

import { useTransition } from "react";
import { confirmEntry, rejectEntry, restoreEntry, setVisibility } from "@/app/actions";
import type { Kind } from "@/lib/vault/labels";

type Props = { kind: Kind; slug: string; status: "draft" | "confirmed" | "rejected"; visibility: "public" | "private" };

export function EntryActions({ kind, slug, status, visibility }: Props) {
  const [pending, start] = useTransition();
  return (
    <div className="actions">
      {status === "draft" && <button className="button button-primary" disabled={pending} onClick={() => start(() => confirmEntry(kind, slug))}>Confirm</button>}
      {status === "confirmed" && <button className="button" disabled={pending} onClick={() => start(() => restoreEntry(kind, slug))}>Move back to drafts</button>}
      {status === "rejected" && <button className="button" disabled={pending} onClick={() => start(() => restoreEntry(kind, slug))}>Restore as draft</button>}
      <button className="button button-quiet" disabled={pending} onClick={() => start(() => setVisibility(kind, slug, visibility === "private" ? "public" : "private"))}>
        {visibility === "private" ? "Make public" : "Make private"}
      </button>
      {status !== "rejected" && <button className="button button-danger" disabled={pending} onClick={() => start(() => rejectEntry(kind, slug))}>Reject</button>}
    </div>
  );
}
