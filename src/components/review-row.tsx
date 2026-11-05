"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { confirmEntry, rejectEntry, setVisibility } from "@/app/actions";
import { VisibilityMark } from "@/components/marks";
import type { Kind } from "@/lib/vault/labels";

const STAMP_MS = 520;

type Props = {
  kind: Kind;
  slug: string;
  title: string;
  kindLabel: string;
  source: string;
  visibility: "public" | "private";
  reviewNote?: string;
  children: ReactNode;
};

export function ReviewRow({ kind, slug, title, kindLabel, source, visibility, reviewNote, children }: Props) {
  const [stamped, setStamped] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const run = (work: () => Promise<void>) => {
    setError(undefined);
    start(async () => {
      try {
        await work();
      } catch (problem) {
        setStamped(false);
        setError(problem instanceof Error ? problem.message : "That didn't save. Try again.");
      }
    });
  };

  const confirm = () => {
    setStamped(true);
    run(async () => {
      await Promise.all([confirmEntry(kind, slug), new Promise((resolve) => setTimeout(resolve, STAMP_MS))]);
    });
  };

  return (
    <article className="row review-row" data-stamped={stamped} data-testid={`review-${kind}-${slug}`}>
      <div className="row-margin">
        <VisibilityMark visibility={visibility} />
      </div>
      <div className="row-main">
        <h3 style={{ fontSize: "1.08rem" }}>{title}</h3>
        <p className="row-note">{kindLabel}. Source: {source}</p>
        <div style={{ margin: "0.6rem 0 0.9rem" }}>{children}</div>
        {reviewNote && <p className="review-note"><strong>Check this:</strong> {reviewNote}</p>}
        <div className="actions">
          <button className="button button-primary" onClick={confirm} disabled={pending}>Confirm</button>
          <Link className="button" href={`/wiki/${kind}/${slug}`}>Edit</Link>
          <button className="button button-quiet" disabled={pending} onClick={() => run(() => setVisibility(kind, slug, visibility === "private" ? "public" : "private"))}>
            {visibility === "private" ? "Make public" : "Make private"}
          </button>
          <button className="button button-danger" disabled={pending} onClick={() => run(() => rejectEntry(kind, slug))}>Reject</button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        {stamped && <span className="stamp" aria-hidden="true">Confirmed</span>}
      </div>
    </article>
  );
}
