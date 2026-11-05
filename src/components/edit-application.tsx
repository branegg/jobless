"use client";

import { useActionState } from "react";
import { removeApplication, saveDetails, type FormState } from "@/app/applications/actions";
import { keepFields } from "./keep-fields";

type Details = { id: number; company: string; title: string; url: string | null; location: string | null; description: string | null };

export function EditApplication({ application }: { application: Details }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDetails.bind(null, application.id), {});
  return (
    <details className="disclosure">
      <summary>Fix the details or delete</summary>
      <div>
        <form onSubmit={keepFields(action)}>
          <div className="field-pair">
            <label className="field"><span>Company</span><input name="company" className="input" defaultValue={application.company} required /></label>
            <label className="field"><span>Role</span><input name="title" className="input" defaultValue={application.title} required /></label>
          </div>
          <div className="field-pair">
            <label className="field"><span>Link to the job</span><input name="url" className="input" inputMode="url" defaultValue={application.url ?? ""} /></label>
            <label className="field"><span>Location</span><input name="location" className="input" defaultValue={application.location ?? ""} /></label>
          </div>
          <label className="field"><span>Job description</span><textarea name="description" className="input input-short" defaultValue={application.description ?? ""} /></label>
          {state.error && <p className="error" role="alert">{state.error}</p>}
          <button className="button" disabled={pending}>Save details</button>
        </form>
        <form action={removeApplication.bind(null, application.id)} className="delete-form">
          <p className="row-note">Deleting removes this application and its whole timeline, and can&apos;t be undone.</p>
          <button className="button button-danger">Delete application</button>
        </form>
      </div>
    </details>
  );
}
