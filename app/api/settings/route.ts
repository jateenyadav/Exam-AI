import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { aiStatus } from "@/lib/ai";
import { env } from "@/lib/env";
import { HttpError, route } from "@/lib/http";

// Must run per request (it reads the Authorization header); never prerender at build time.
export const dynamic = "force-dynamic";

/**
 * GET /api/settings — read-only admin status. Secrets are configured as
 * environment variables only; this endpoint never returns or accepts them.
 * Requires `Authorization: Bearer <ADMIN_TOKEN>`; disabled when ADMIN_TOKEN is unset.
 */
export const GET = route(async (req) => {
  const e = env();
  if (!e.ADMIN_TOKEN) throw new HttpError(404, "Admin status is disabled (set ADMIN_TOKEN to enable it)");

  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(e.ADMIN_TOKEN);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, "Unauthorized");

  return NextResponse.json({
    ai: aiStatus(),
    email: { configured: Boolean(e.EMAIL_SMTP_HOST && e.EMAIL_SMTP_USER && e.EMAIL_SMTP_PASS), from: e.EMAIL_FROM },
    limits: {
      papersPerStudentPerDay: e.PAPERS_PER_STUDENT_PER_DAY,
      papersGlobalPerDay: e.PAPERS_GLOBAL_PER_DAY,
      signupsPerIpPerHour: e.SIGNUPS_PER_IP_PER_HOUR,
      emailsPerStudentPerDay: e.EMAILS_PER_STUDENT_PER_DAY,
    },
  });
});
