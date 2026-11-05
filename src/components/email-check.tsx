"use client";

import { useActionState } from "react";
import { checkEmailAction, type CheckState } from "@/app/email/actions";
import { keepFields } from "./keep-fields";

export function EmailCheck() {
  const [state, action, pending] = useActionState<CheckState, FormData>(checkEmailAction, {});
  return (
    <form onSubmit={keepFields(action)} className="check-form">
      <button className="button" disabled={pending}>{pending ? "Checking your email…" : "Check now"}</button>
      {state.message && <p className="row-note" role="status">{state.message}</p>}
      {state.error && <p className="error" role="alert">{state.error}</p>}
    </form>
  );
}
