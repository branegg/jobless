"use client";

import { useActionState } from "react";
import { addEntry, type AddState } from "@/app/actions";
import { keepFields } from "./keep-fields";
import { KIND_LABELS, type Kind } from "@/lib/vault/labels";

export function AddEntry() {
  const [state, action, pending] = useActionState<AddState, FormData>(addEntry, {});
  return (
    <details className="disclosure">
      <summary>Add something to your profile</summary>
      <div>
        <form onSubmit={keepFields(action)}>
          <label className="field">
            <span>Where it belongs</span>
            <select name="kind" className="input" defaultValue="facts">
              {(Object.keys(KIND_LABELS) as Kind[]).map((kind) => <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>)}
            </select>
          </label>
          <label className="field"><span>Title</span><input name="title" className="input" required /></label>
          <label className="field"><span>Details</span><textarea name="body" className="input" /></label>
          <label className="field"><span>Tags, separated by commas</span><input name="tags" className="input" /></label>
          <label className="field" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="checkbox" name="private" />
            <span style={{ margin: 0 }}>Keep private, so it never goes into an application</span>
          </label>
          {state.error && <p className="error" role="alert">{state.error}</p>}
          <button className="button button-primary" disabled={pending}>Add to profile</button>
        </form>
      </div>
    </details>
  );
}
