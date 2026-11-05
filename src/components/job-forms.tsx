"use client";

import { useActionState } from "react";
import { checkForJobs, pasteJob, type CheckState, type PasteState } from "@/app/jobs/actions";
import { keepFields } from "./keep-fields";

export function PasteJob() {
  const [state, action, pending] = useActionState<PasteState, FormData>(pasteJob, {});
  return (
    <details className="disclosure">
      <summary>Add a job from a link</summary>
      <div>
        <form onSubmit={keepFields(action)}>
          <label className="field"><span>Link to the job</span><input name="url" className="input" inputMode="url" required /></label>
          <p className="row-note form-hint">Greenhouse, Lever, Ashby and Workable links fill in the rest. For anything else, including LinkedIn, add the details below.</p>
          <div className="field-pair">
            <label className="field"><span>Company</span><input name="company" className="input" /></label>
            <label className="field"><span>Role</span><input name="title" className="input" /></label>
          </div>
          <label className="field"><span>Location</span><input name="location" className="input" /></label>
          <label className="field"><span>Job description</span><textarea name="description" className="input input-short" /></label>
          {state.error && <p className="error" role="alert">{state.error}</p>}
          <button className="button button-primary" disabled={pending}>{pending ? "Adding…" : "Add job"}</button>
        </form>
      </div>
    </details>
  );
}

export function CheckJobs() {
  const [state, action, pending] = useActionState<CheckState, FormData>(checkForJobs, {});
  return (
    <form onSubmit={keepFields(action)} className="check-form">
      <button className="button" disabled={pending}>{pending ? "Checking, this can take a few minutes…" : "Check for new jobs"}</button>
      {state.message && <p className="row-note" role="status">{state.message}</p>}
      {state.error && <p className="error" role="alert">{state.error}</p>}
    </form>
  );
}
