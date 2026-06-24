"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { apiRequest } from "@/lib/api";

type IntegrationSetting = {
  key: string;
  label: string;
  description: string;
  category: "sms" | "email" | "general";
  type: "secret" | "text" | "boolean";
  configured: boolean;
  value?: string;
  maskedValue?: string;
  source: "database" | "environment" | "default";
  placeholder?: string;
  updatedAt?: string;
};

const categoryLabels: Record<IntegrationSetting["category"], string> = {
  sms: "SMS (Semaphore)",
  email: "Email",
  general: "General",
};

const sourceLabels: Record<IntegrationSetting["source"], string> = {
  database: "Saved in app",
  environment: "From .env file",
  default: "Default",
};

export default function IntegrationSettingsPage() {
  const [settings, setSettings] = useState<IntegrationSetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<IntegrationSetting[]>("/integration-settings");
      setSettings(data);
      setDrafts({});
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    return settings.reduce<Record<string, IntegrationSetting[]>>((acc, setting) => {
      acc[setting.category] = acc[setting.category] ?? [];
      acc[setting.category].push(setting);
      return acc;
    }, {});
  }, [settings]);

  function updateDraft(key: string, value: string) {
    setDrafts((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = Object.entries(drafts)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => ({ key, value }));

    if (!payload.length) {
      setError("Change at least one setting before saving.");
      setSaving(false);
      return;
    }

    try {
      const data = await apiRequest<IntegrationSetting[]>("/integration-settings", {
        method: "PUT",
        body: JSON.stringify({ settings: payload }),
      });
      setSettings(data);
      setDrafts({});
      setSuccess("Integration settings saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-violet-700">
          <KeyRound className="h-4 w-4" />
          Administration
        </div>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Integration Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Store API keys and integration credentials securely. Secret values are encrypted
          in the database.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading settings...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {Object.entries(grouped).map(([category, items]) => (
            <section
              key={category}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {categoryLabels[category as IntegrationSetting["category"]] ?? category}
              </h2>

              <div className="mt-4 space-y-5">
                {items.map((setting) => (
                  <div key={setting.key} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{setting.label}</p>
                        <p className="mt-1 text-sm text-slate-500">{setting.description}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {sourceLabels[setting.source]}
                      </span>
                    </div>

                    {setting.type === "boolean" ? (
                      <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={
                            (drafts[setting.key] ?? setting.value ?? "true") === "true"
                          }
                          onChange={(event) =>
                            updateDraft(setting.key, event.target.checked ? "true" : "false")
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Enable outbound SMS
                      </label>
                    ) : setting.type === "secret" ? (
                      <div className="mt-3">
                        <input
                          type="password"
                          value={drafts[setting.key] ?? ""}
                          onChange={(event) => updateDraft(setting.key, event.target.value)}
                          placeholder={
                            setting.configured
                              ? `Configured ${setting.maskedValue ?? ""} — enter new key to replace`
                              : setting.placeholder ?? "Enter API key"
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        {setting.configured ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Leave blank to keep the current saved key.
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={drafts[setting.key] ?? setting.value ?? ""}
                        onChange={(event) => updateDraft(setting.key, event.target.value)}
                        placeholder={setting.placeholder}
                        className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    )}

                    {setting.updatedAt ? (
                      <p className="mt-2 text-xs text-slate-400">
                        Last updated {new Date(setting.updatedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          {success ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save settings"}
          </button>
        </form>
      )}
    </div>
  );
}
