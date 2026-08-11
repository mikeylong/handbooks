import { getAppMode, readRuntimeConfig } from "@/lib/config";

export async function GET() {
  try {
    const config = readRuntimeConfig();
    return Response.json({ ok: true, mode: config.APP_MODE });
  } catch {
    return Response.json(
      { ok: false, mode: getAppMode(), configuration: "invalid" },
      { status: 503 },
    );
  }
}
