import fs from "node:fs/promises";
import path from "node:path";
import { PHOTOS_DIR } from "@/lib/db";
import { getPhotoByFile } from "@/features/body/queries";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

// Photos are never exposed from /public: they are only served here, and only if registered in the database.
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const safe = path.basename(file);
  if (safe !== file || !getPhotoByFile(safe)) return new Response("Not found", { status: 404 });
  try {
    const data = await fs.readFile(path.join(/*turbopackIgnore: true*/ PHOTOS_DIR, safe));
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[safe.split(".").pop() ?? ""] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
