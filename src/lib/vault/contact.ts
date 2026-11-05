import fs from "node:fs";
import path from "node:path";
import { parse, stringify } from "yaml";
import { z } from "zod";
import { vaultDir } from "./entries";

export const contactSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().min(3),
  phone: z.string().trim().default(""),
  location: z.string().trim().default(""),
  links: z.array(z.object({ label: z.string().trim().min(1), url: z.string().regex(/^https?:\/\/\S+$/i) })).default([]),
  confirmed: z.boolean().default(false),
  source: z.string().optional(),
});

export type Contact = z.infer<typeof contactSchema>;

function contactPath(): string {
  return path.join(vaultDir(), "contact.yaml");
}

export function readContact(): Contact | undefined {
  const file = contactPath();
  if (!fs.existsSync(file)) return undefined;
  return contactSchema.parse(parse(fs.readFileSync(file, "utf8")));
}

export function writeContact(contact: Contact): void {
  fs.mkdirSync(vaultDir(), { recursive: true });
  fs.writeFileSync(contactPath(), stringify(contactSchema.parse(contact)));
}
