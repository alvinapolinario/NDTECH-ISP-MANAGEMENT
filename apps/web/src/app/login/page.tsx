"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { loginRequest } from "@/lib/api";
import { BASE_PATH, withBasePath } from "@/lib/base-path";
import { storeAuthSession } from "@/lib/auth-user";

function normalizeNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/";
  }

  if (BASE_PATH && (next === BASE_PATH || next.startsWith(`${BASE_PATH}/`))) {
    const stripped = next.slice(BASE_PATH.length);
    return stripped.startsWith("/") ? stripped : `/${stripped}`;
  }

  return next;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const session = await loginRequest(email.trim(), password);
      storeAuthSession({
        accessToken: session.accessToken,
        user: session.user,
      });

      const next = normalizeNextPath(searchParams.get("next"));
      // Hard navigation so middleware sees the auth cookie on the next request.
      window.location.assign(withBasePath(next));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f9] px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <p className="text-lg font-bold tracking-tight text-slate-900">
            ND<span className="text-violet-600">TECH</span>
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
            ISP Billing
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Admin portal access requires a Super Admin or Admin account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-900">Email</span>
            <input
              required
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-900">Password</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-md border border-slate-200 px-3 py-2 outline-none focus:border-emerald-500"
            />
          </label>

          {error ? (
            <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:bg-slate-300"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f6f9] text-sm text-slate-500">
          Loading sign-in...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
