import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

/** An error that is safe to show to the client, with an HTTP status. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

type Handler = (req: NextRequest) => Promise<Response>;

/**
 * Wraps a route handler with: a request id, structured JSON logs (one line per
 * request — Vercel/Render ingest these), and uniform error responses that
 * never leak stack traces or internal messages.
 */
export function route(handler: Handler): Handler {
  return async (req) => {
    const requestId = randomUUID();
    const started = Date.now();
    const base = { requestId, method: req.method, path: req.nextUrl.pathname };
    try {
      const res = await handler(req);
      res.headers.set("x-request-id", requestId);
      log("info", { ...base, status: res.status, ms: Date.now() - started });
      return res;
    } catch (err) {
      if (err instanceof HttpError) {
        log(err.status >= 500 ? "error" : "warn", { ...base, status: err.status, ms: Date.now() - started, msg: err.message });
        return withId(NextResponse.json({ error: err.message, details: err.details }, { status: err.status }), requestId);
      }
      if (err instanceof ZodError) {
        log("warn", { ...base, status: 400, msg: "validation" });
        return withId(NextResponse.json({ error: "Invalid request", details: formatIssues(err) }, { status: 400 }), requestId);
      }
      // Prisma error codes (e.g. P1001 "database unreachable") say what failed without leaking details.
      const code = typeof (err as { code?: unknown })?.code === "string" && /^P\d{4}$/.test((err as { code: string }).code) ? (err as { code: string }).code : undefined;
      const kind = err instanceof Error && err.constructor?.name?.startsWith("Prisma") ? err.constructor.name : undefined;
      log("error", { ...base, status: 500, ms: Date.now() - started, code, kind, msg: err instanceof Error ? err.message : String(err) });
      return withId(NextResponse.json({ error: "Something went wrong. Please try again.", requestId, ...(code && { code }), ...(kind && { kind }) }, { status: 500 }), requestId);
    }
  };
}

function withId(res: NextResponse, requestId: string) {
  res.headers.set("x-request-id", requestId);
  return res;
}

export function log(level: "info" | "warn" | "error", fields: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test") return;
  const line = JSON.stringify({ level, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

function formatIssues(err: ZodError) {
  return err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

/** Parse + validate a JSON body. Throws HttpError(400) with field-level details. */
export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, "Invalid request", formatIssues(parsed.error));
  return parsed.data;
}

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
