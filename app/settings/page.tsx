"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const AI_PROVIDERS = [
  { value: "gemini", label: "Google Gemini (Direct)" },
  { value: "openrouter", label: "OpenRouter" },
];

interface SettingsForm {
  GEMINI_API_KEY: string;
  OPENROUTER_API_KEY: string;
  AI_PROVIDER: string;
  EMAIL_FROM: string;
  EMAIL_SMTP_HOST: string;
  EMAIL_SMTP_PORT: string;
  EMAIL_SMTP_USER: string;
  EMAIL_SMTP_PASS: string;
  ADMIN_PASSWORD: string;
}

const defaultSettings: SettingsForm = {
  GEMINI_API_KEY: "",
  OPENROUTER_API_KEY: "",
  AI_PROVIDER: "gemini",
  EMAIL_FROM: "",
  EMAIL_SMTP_HOST: "",
  EMAIL_SMTP_PORT: "",
  EMAIL_SMTP_USER: "",
  EMAIL_SMTP_PASS: "",
  ADMIN_PASSWORD: "",
};

export default function SettingsPage() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [settings, setSettings] = useState<SettingsForm>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  async function checkAuth() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/settings?password=${encodeURIComponent(password)}`);
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...defaultSettings, ...data.settings });
        setIsAuthenticated(true);
      } else if (res.status === 401) {
        toast({ title: "Wrong password", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetch("/api/settings?password=")
      .then((res) => {
        if (res.ok) {
          res.json().then((data) => {
            const hasPassword = data.settings.ADMIN_PASSWORD && data.settings.ADMIN_PASSWORD !== "";
            if (!hasPassword) {
              setIsFirstTime(true);
              setIsAuthenticated(true);
              setSettings({ ...defaultSettings, ...data.settings });
            }
          });
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, settings }),
      });

      if (res.ok) {
        toast({ title: "Settings saved successfully!" });
        if (isFirstTime && settings.ADMIN_PASSWORD) {
          setPassword(settings.ADMIN_PASSWORD);
          setIsFirstTime(false);
        }
      } else {
        const err = await res.json();
        toast({ title: err.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    }
    setIsSaving(false);
  }

  function updateField(key: keyof SettingsForm, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
                E
              </div>
              <span className="text-xl font-bold">ExamAce</span>
            </Link>
          </div>
        </header>

        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Admin Settings</CardTitle>
              <CardDescription>Enter password to access settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && checkAuth()}
                />
              </div>
              <Button className="w-full" onClick={checkAuth} disabled={isLoading}>
                {isLoading ? "Checking..." : "Login"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              E
            </div>
            <span className="text-xl font-bold">ExamAce</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">Back to Home</Button>
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure API keys and preferences</p>
        </div>

        {isFirstTime && (
          <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                First time setup! Set an admin password below to protect these settings.
              </p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>AI Provider</CardTitle>
            <CardDescription>Choose which AI to use for generating papers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Primary AI Provider</Label>
              <div className="flex gap-3 mt-2">
                {AI_PROVIDERS.map((p) => (
                  <Button
                    key={p.value}
                    variant={settings.AI_PROVIDER === p.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateField("AI_PROVIDER", p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                If primary fails, the other provider is used as fallback automatically.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>Keys are stored encrypted in the database, never in code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Google Gemini API Key</Label>
              <Input
                type="password"
                placeholder="AIzaSy..."
                value={settings.GEMINI_API_KEY}
                onChange={(e) => updateField("GEMINI_API_KEY", e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get from <a href="https://aistudio.google.com/apikey" target="_blank" className="underline">Google AI Studio</a>
              </p>
            </div>
            <div>
              <Label>OpenRouter API Key</Label>
              <Input
                type="password"
                placeholder="sk-or-v1-..."
                value={settings.OPENROUTER_API_KEY}
                onChange={(e) => updateField("OPENROUTER_API_KEY", e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get from <a href="https://openrouter.ai/keys" target="_blank" className="underline">OpenRouter</a>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email (Optional)</CardTitle>
            <CardDescription>For sending exam results to students/parents</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>SMTP Host</Label>
                <Input
                  placeholder="smtp.gmail.com"
                  value={settings.EMAIL_SMTP_HOST}
                  onChange={(e) => updateField("EMAIL_SMTP_HOST", e.target.value)}
                />
              </div>
              <div>
                <Label>SMTP Port</Label>
                <Input
                  placeholder="587"
                  value={settings.EMAIL_SMTP_PORT}
                  onChange={(e) => updateField("EMAIL_SMTP_PORT", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label>From Email</Label>
              <Input
                placeholder="noreply@example.com"
                value={settings.EMAIL_FROM}
                onChange={(e) => updateField("EMAIL_FROM", e.target.value)}
              />
            </div>
            <div>
              <Label>SMTP User</Label>
              <Input
                placeholder="your-email@gmail.com"
                value={settings.EMAIL_SMTP_USER}
                onChange={(e) => updateField("EMAIL_SMTP_USER", e.target.value)}
              />
            </div>
            <div>
              <Label>SMTP Password / App Password</Label>
              <Input
                type="password"
                placeholder="App password"
                value={settings.EMAIL_SMTP_PASS}
                onChange={(e) => updateField("EMAIL_SMTP_PASS", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admin Password</CardTitle>
            <CardDescription>Protects this settings page</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder={isFirstTime ? "Set a password" : "Change password (leave empty to keep current)"}
                value={settings.ADMIN_PASSWORD}
                onChange={(e) => updateField("ADMIN_PASSWORD", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Button className="w-full h-11 text-base" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
