"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PdfDocumentRecord } from "@/lib/types";
import { BookOpen, FolderOpen, ArrowRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const supabase = createClient();

  const [docs, setDocs] = useState<PdfDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase
        .from("pdf_documents")
        .select("*")
        .order("last_opened_at", { ascending: false })
        .limit(6);

      if (active) {
        setDocs((data as PdfDocumentRecord[]) || []);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] text-sm text-slate-500">
        লোড হচ্ছে...
      </main>
    );
  }

  const lastDoc = docs[0];

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">PDF Notes</h1>
          <button
            type="button"
            onClick={() => router.push("/documents")}
            className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400"
          >
            <FolderOpen className="h-4 w-4" />
            <span>All PDFs</span>
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-4xl space-y-6 p-4">
        {lastDoc ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-slate-300">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
              যেখানে ছেড়েছিলেন সেখান থেকে চালিয়ে যান
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <h2 title={lastDoc.title} className="text-base font-bold text-slate-900 truncate">
                  {lastDoc.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Page {lastDoc.last_page} of {lastDoc.page_count}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/editor/${lastDoc.id}`)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 shrink-0"
              >
                <BookOpen className="h-4 w-4" />
                <span>Continue Reading</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-700">এখনো কোনো PDF ফাইল নেই।</p>
            <button
              type="button"
              onClick={() => router.push("/documents")}
              className="mt-3 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400"
            >
              প্রথম PDF আপলোড করুন
            </button>
          </div>
        )}

        {docs.length > 0 && (
          <div>
            <h3 className="mb-2.5 text-sm font-semibold text-slate-700">সাম্প্রতিক ফাইল</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {docs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(`/editor/${item.id}`)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm hover:border-slate-300 transition-colors overflow-hidden"
                >
                  <div className="min-w-0 flex-1">
                    <p title={item.title} className="truncate text-sm font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      Page {item.last_page} / {item.page_count}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
