"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PdfDocumentRecord } from "@/lib/types";
import { FileText, Trash2, Edit3, Upload, LogOut } from "lucide-react";

export default function DocumentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [docs, setDocs] = useState<PdfDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadDocs = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("pdf_documents")
      .select("*")
      .order("last_opened_at", { ascending: false });

    if (!error && data) {
      setDocs(data as PdfDocumentRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setUploading(false);
      return;
    }

    let pageCount = 1;
    try {
      const buffer = await file.arrayBuffer();
      const pdfjsLib = await import("pdfjs-dist");
      if (typeof window !== "undefined") {
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      }
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      pageCount = pdf.numPages || 1;
    } catch {
      // Fallback to 1 if page count reading fails
    }

    const cleanName = file.name.replace(/[^\w.-]/g, "_");
    const storagePath = `${user.id}/${Date.now()}_${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from("pdfs")
      .upload(storagePath, file, { contentType: "application/pdf" });

    if (!uploadError) {
      await supabase.from("pdf_documents").insert({
        user_id: user.id,
        title: file.name.replace(/\.pdf$/i, ""),
        storage_path: storagePath,
        file_size_bytes: file.size,
        page_count: pageCount,
        last_page: 1,
        annotations: [],
      });
      await loadDocs();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleRename = async (doc: PdfDocumentRecord) => {
    const nextTitle = window.prompt("নতুন নাম দিন:", doc.title);
    if (!nextTitle || !nextTitle.trim()) return;

    await supabase
      .from("pdf_documents")
      .update({ title: nextTitle.trim() })
      .eq("id", doc.id);

    setDocs((prev) =>
      prev.map((item) => (item.id === doc.id ? { ...item, title: nextTitle.trim() } : item))
    );
  };

  const handleDelete = async (doc: PdfDocumentRecord) => {
    const ok = window.confirm(`"${doc.title}" মুছে ফেলতে চান?`);
    if (!ok) return;

    await supabase.storage.from("pdfs").remove([doc.storage_path]);
    await supabase.from("pdf_documents").delete().eq("id", doc.id);
    setDocs((prev) => prev.filter((item) => item.id !== doc.id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">PDF Notes — Library</h1>
          <div className="flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400">
              <Upload className="h-4 w-4" />
              <span>{uploading ? "Uploading..." : "Upload PDF"}</span>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl p-4">
        {loading ? (
          <p className="text-sm text-slate-500">লোড হচ্ছে...</p>
        ) : docs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-slate-600">এখনো কোনো PDF আপলোড করা হয়নি।</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 transition-colors overflow-hidden"
              >
                {/* বাম পাশ: আইকন ও টাইটেল (min-w-0 এবং flex-1 থাকা বাধ্যতামূলক) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/editor/${doc.id}`)}
                  onKeyDown={(e) => e.key === "Enter" && router.push(`/editor/${doc.id}`)}
                  className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center shrink-0 text-amber-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      title={doc.title}
                      className="font-semibold text-slate-900 text-sm sm:text-base truncate"
                    >
                      {doc.title}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      Page {doc.last_page} / {doc.page_count} •{" "}
                      {(doc.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                </div>

                {/* ডান পাশ: এডিট ও ডিলিট বাটন (shrink-0 যাতে কখনোই সংকুচিত বা নিচে না নামে) */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRename(doc)}
                    className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Rename"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
