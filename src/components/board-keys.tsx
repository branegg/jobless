"use client";

import { useActionState } from "react";
import { connectAdzuna, connectReed, type KeyState } from "@/app/job-sources/actions";
import { keepFields } from "./keep-fields";

function Outcome({ state }: { state: KeyState }) {
  if (state.error) return <p className="error" role="alert">{state.error}</p>;
  return state.message ? <p className="row-note" role="status">{state.message}</p> : null;
}

export function ReedKey({ connected }: { connected: boolean }) {
  const [state, action, pending] = useActionState<KeyState, FormData>(connectReed, {});
  return (
    <form onSubmit={keepFields(action)}>
      <label className="field"><span>API key</span><input name="key" type="password" autoComplete="off" className="input" required /></label>
      <Outcome state={state} />
      <button className="button" disabled={pending}>{pending ? "Testing the key…" : connected ? "Replace key" : "Connect Reed"}</button>
    </form>
  );
}

export function AdzunaKeys({ connected }: { connected: boolean }) {
  const [state, action, pending] = useActionState<KeyState, FormData>(connectAdzuna, {});
  return (
    <form onSubmit={keepFields(action)}>
      <div className="field-pair">
        <label className="field"><span>Application ID</span><input name="id" autoComplete="off" className="input" required /></label>
        <label className="field"><span>Application Key</span><input name="key" type="password" autoComplete="off" className="input" required /></label>
      </div>
      <Outcome state={state} />
      <button className="button" disabled={pending}>{pending ? "Testing the keys…" : connected ? "Replace keys" : "Connect Adzuna"}</button>
    </form>
  );
}
