import { connection } from "next/server";
import { ContactForm } from "@/components/contact-form";
import { readContact } from "@/lib/vault/contact";

export const metadata = { title: "Contact details" };

export default async function ContactPage() {
  await connection();
  const contact = readContact();
  return (
    <>
      <header className="page-head">
        <h1>Contact details</h1>
        <p className="lede">These go at the top of every CV and into application forms. They&apos;re saved only on this Mac.</p>
      </header>
      {contact && !contact.confirmed && <p className="review-box">These came from {contact.source ?? "your CV"}. Check them and save, and CVs can use them.</p>}
      <ContactForm contact={contact} />
    </>
  );
}
