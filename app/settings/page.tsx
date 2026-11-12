"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/brand/site-header";
import { AlertCircle } from "lucide-react";

interface Status {
  ai: { providers: string[]; geminiModel: string | null; openrouterModel: string | null };
  email: { configured: boolean; from: string };
  limits: Record<string, number>;
}

/**
 * Read-only admin status. Keys and SMTP credentials are configured as
 * environment variables (Vercel → Settings → Environment Variables) — the app
 * never stores secrets in its database or accepts them from a browser.
 */
export default function SettingsPage() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setStatus(data);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader sticky={false}>
        <Link href="/">
          <Button variant="ghost" size="sm" className="h-10">Home</Button>
        </Link>
      </SiteHeader>

      <main className="container mx-auto max-w-xl px-4 py-12 space-y-6">
        <Card className="rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle>Admin status</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configuration lives in environment variables (<code>GEMINI_API_KEY</code>, <code>OPENROUTER_API_KEY</code>,{" "}
              <code>EMAIL_SMTP_*</code>…). This page only shows what is active. Enter the <code>ADMIN_TOKEN</code> to view it.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="token">Admin token</Label>
              <Input
                id="token"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && token && load()}
                className="mt-1 h-11"
              />
            </div>
            <Button onClick={load} disabled={!token || loading} className="h-11 w-full rounded-full">
              {loading ? "Checking…" : "Show status"}
            </Button>
            {error && (
              <p role="alert" className="flex items-center gap-2 rounded-xl border border-tone-coral-border bg-tone-coral-soft p-3 text-sm text-tone-coral-fg">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        {status && (
          <Card className="rounded-2xl shadow-soft">
            <CardContent className="space-y-4 pt-6 text-sm">
              <div>
                <p className="font-medium mb-1">AI providers (in fallback order)</p>
                {status.ai.providers.length ? (
                  <div className="flex gap-2 flex-wrap">
                    {status.ai.providers.map((p) => (
                      <Badge key={p}>{p}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-tone-coral-fg">None configured — set GEMINI_API_KEY (free in Google AI Studio).</p>
                )}
                <p className="text-muted-foreground mt-1">
                  Gemini model: {status.ai.geminiModel ?? "—"} · OpenRouter model: {status.ai.openrouterModel ?? "—"}
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">E-mail reports</p>
                <p className="text-muted-foreground">{status.email.configured ? `Enabled — from ${status.email.from}` : "Disabled (SMTP not configured)"}</p>
              </div>
              <div>
                <p className="font-medium mb-1">Limits</p>
                <ul className="text-muted-foreground space-y-0.5">
                  {Object.entries(status.limits).map(([k, v]) => (
                    <li key={k}>
                      {k}: {v}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
