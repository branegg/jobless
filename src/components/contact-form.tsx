"use client";

import { useActionState } from "react";
import { saveContact, type ContactState } from "@/app/contact/actions";
import type { Contact } from "@/lib/vault/contact";
import { keepFields } from "./keep-fields";

export function ContactForm({ contact }: { contact?: Contact }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(saveContact, {});
  return (
    <form onSubmit={keepFields(action)} className="contact-form">
      <label className="field"><span>Name</span><input name="name" className="input" defaultValue={contact?.name} required /></label>
      <div className="field-pair">
        <label className="field"><span>Email</span><input name="email" type="email" className="input" defaultValue={contact?.email} required /></label>
        <label className="field"><span>Phone</span><input name="phone" className="input" defaultValue={contact?.phone} /></label>
      </div>
      <label className="field"><span>Location, as shown on your CV</span><input name="location" className="input" defaultValue={contact?.location} /></label>
      <label className="field">
        <span>Links, one per line, as a label then the address</span>
        <textarea name="links" className="input input-short" defaultValue={contact?.links.map((link) => `${link.label} ${link.url}`).join("\n")} />
      </label>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      {state.saved && <p className="row-note" role="status">Saved. CVs can use these now.</p>}
      <button className="button button-primary" disabled={pending}>Save contact details</button>
    </form>
  );
}
