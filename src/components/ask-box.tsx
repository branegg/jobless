"use client";

import { useActionState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { askProfile, type AskState } from "@/app/actions";

export function AskBox() {
  const [state, action, pending] = useActionState<AskState, FormData>(askProfile, {});
  return (
    <div>
      <form action={action} className="inline-form">
        <label className="sr-only" htmlFor="question">Ask about your career</label>
        <input id="question" name="question" className="input" defaultValue={state.question} placeholder="When did I last lead a team, and what came of it?" autoComplete="off" />
        <button className="button button-primary" disabled={pending}>{pending ? "Reading your profile…" : "Ask"}</button>
      </form>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.answer && !pending && (
        <div className="prose" style={{ marginTop: "1rem" }} aria-live="polite">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{state.answer}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
