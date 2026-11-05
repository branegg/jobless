import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { vaultDir } from "@/lib/vault/entries";

const TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif" };

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const root = fs.realpathSync(path.join(vaultDir(), "assets"));
  const target = path.join(root, ...parts);
  const type = TYPES[path.extname(target).toLowerCase()];
  if (!type || !fs.existsSync(target) || !fs.realpathSync(target).startsWith(root + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }
  return new NextResponse(fs.readFileSync(target), { headers: { "Content-Type": type, "X-Content-Type-Options": "nosniff" } });
}
