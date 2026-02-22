import { NextRequest, NextResponse } from "next/server";
import { getSettings, setSetting } from "@/lib/settings";

const ALLOWED_KEYS = [
  "GEMINI_API_KEY",
  "OPENROUTER_API_KEY",
  "AI_PROVIDER",
  "EMAIL_FROM",
  "EMAIL_SMTP_HOST",
  "EMAIL_SMTP_PORT",
  "EMAIL_SMTP_USER",
  "EMAIL_SMTP_PASS",
  "ADMIN_PASSWORD",
];

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password");

  const settings = await getSettings();
  const stored = settings["ADMIN_PASSWORD"];

  if (stored && stored !== password) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const safe: Record<string, string> = {};
  for (const key of ALLOWED_KEYS) {
    const val = settings[key] || "";
    if (key.includes("KEY") || key.includes("PASS")) {
      safe[key] = val ? "••••••" + val.slice(-4) : "";
    } else {
      safe[key] = val;
    }
  }

  return NextResponse.json({ settings: safe });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password, settings: incoming } = body as {
      password: string;
      settings: Record<string, string>;
    };

    const current = await getSettings();
    const stored = current["ADMIN_PASSWORD"];

    if (stored && stored !== password) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    for (const [key, value] of Object.entries(incoming)) {
      if (!ALLOWED_KEYS.includes(key)) continue;
      if (value && value !== "••••••" + (current[key] || "").slice(-4)) {
        await setSetting(key, value);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
