import fs from "node:fs";
import path from "node:path";
import { cvPath } from "@/lib/packets/build";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const file = Number.isInteger(id) && id > 0 ? cvPath(id) : undefined;
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(path.basename(file))}"` },
  });
}
