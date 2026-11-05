"use server";

import { revalidatePath } from "next/cache";
import { commitVault } from "@/lib/vault/git";
import { contactSchema, writeContact } from "@/lib/vault/contact";

export type ContactState = { error?: string; saved?: boolean };

function parseLinks(value: string): { label: string; url: string }[] | undefined {
  const links = [];
  for (const line of value.split("\n").map((item) => item.trim()).filter(Boolean)) {
    const match = line.match(/^(.+?)[:,]?\s+(https?:\/\/\S+)$/i);
    if (!match) return undefined;
    links.push({ label: match[1].trim(), url: match[2] });
  }
  return links;
}

export async function saveContact(_previous: ContactState, form: FormData): Promise<ContactState> {
  const links = parseLinks(String(form.get("links") ?? ""));
  if (!links) return { error: "Write each link on its own line, as a label then the address: GitHub https://github.com/you" };
  const parsed = contactSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    phone: form.get("phone"),
    location: form.get("location"),
    links,
    confirmed: true,
    source: `checked by me on ${new Date().toISOString().slice(0, 10)}`,
  });
  if (!parsed.success) return { error: "Your name and email are needed." };
  writeContact(parsed.data);
  try {
    commitVault("contact: confirm details");
  } catch (error) {
    console.error("Could not record vault history", error);
  }
  revalidatePath("/", "layout");
  return { saved: true };
}
