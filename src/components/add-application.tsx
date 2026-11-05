"use client";

import Link from "next/link";
import { useActionState } from "react";
import { addApplicationAction, type FormState } from "@/app/applications/actions";
import { keepFields } from "./keep-fields";
import { STAGE_LABELS, type Stage } from "@/lib/stages";

const STARTING: Stage[] = ["saved", "submitted", "screening", "interview", "offer"];

export function AddApplication({ open, today }: { open: boolean; today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addApplicationAction, {});
  return (
    <details className="disclosure" open={open}>
      <summary>Add an application</summary>
      <div>
        <form onSubmit={keepFields(action)}>
          <div className="field-pair">
            <label className="field"><span>Company</span><input name="company" className="input" required /></label>
            <label className="field"><span>Role</span><input name="title" className="input" required /></label>
          </div>
          <div className="field-pair">
            <label className="field"><span>Link to the job (optional)</span><input name="url" className="input" inputMode="url" /></label>
            <label className="field"><span>Location (optional)</span><input name="location" className="input" /></label>
          </div>
          <div className="field-pair">
            <label className="field">
              <span>Where it is now</span>
              <select name="stage" className="input" defaultValue="submitted">
                {STARTING.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
              </select>
            </label>
            <label className="field"><span>Date you sent it</span><input name="appliedOn" type="date" className="input" defaultValue={today} /></label>
          </div>
          <label className="field"><span>Job description (needed to write a CV for it)</span><textarea name="description" className="input input-short" /></label>
          <label className="field"><span>Notes (optional)</span><textarea name="note" className="input input-short" /></label>
          {state.error && (
            <p className="error" role="alert">
              {state.error}
              {state.existingId && <> <Link href={`/applications/${state.existingId}`}>Open it</Link></>}
            </p>
          )}
          <button className="button button-primary" disabled={pending}>Add application</button>
        </form>
      </div>
    </details>
  );
}
