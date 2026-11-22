"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const ALLOWED_EMAIL = "mrrahatkhan26@gmail.com";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail !== ALLOWED_EMAIL) {
      setErrorMsg("শুধুমাত্র অনুমোদিত অ্যাকাউন্ট দিয়ে লগইন করা যাবে।");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/documents");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4 text-slate-900">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-5 text-center">
          <h1 className="text-xl font-bold text-slate-900">লগইন</h1>
          <p className="mt-1 text-xs text-slate-500">
            PDF Notes এ প্রবেশ করতে লগইন করুন
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              ইমেইল
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="আপনার ইমেইল দিন"
              aria-label="Email"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              পাসওয়ার্ড
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="আপনার পাসওয়ার্ড দিন"
              aria-label="Password"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {errorMsg && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
            {errorMsg}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-50"
        >
          {loading ? "লগইন হচ্ছে..." : "সাইন ইন করুন"}
        </button>
      </form>
    </main>
  );
}
