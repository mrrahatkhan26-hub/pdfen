"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/utils/supabase/client";
import { AnnotationItem, PdfDocumentRecord } from "@/lib/types";
import { getCachedPdf, saveCachedPdf } from "@/lib/pdfCache";

const PdfEditorCanvas = dynamic(() => import("@/components/PdfEditorCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[#F8FAFC] text-sm text-slate-500">
      PDF এডিটর লোড হচ্ছে...
    </div>
  ),
});

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [doc, setDoc] = useState<PdfDocumentRecord | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const docId = params.id;
      if (!docId) return;

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
        .eq("id", docId)
        .single();

      if (error || !data) {
        if (active) setErrorMsg("ডকুমেন্টটি খুঁজে পাওয়া যায়নি।");
        return;
      }

      if (active) setDoc(data as PdfDocumentRecord);

      // প্রথমে ব্রাউজার ক্যাশ যাচাই, না থাকলে Supabase Storage থেকে নামানো
      const cached = await getCachedPdf(docId);
      if (cached) {
        if (active) setPdfBlob(cached);
        return;
      }

      const { data: fileData, error: dlError } = await supabase.storage
        .from("pdfs")
        .download(data.storage_path);

      if (dlError || !fileData) {
        if (active) setErrorMsg("PDF ফাইলটি লোড করা যায়নি।");
        return;
      }

      await saveCachedPdf(docId, fileData);
      if (active) setPdfBlob(fileData);
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleSaveState = useCallback(
    async (annotations: AnnotationItem[], lastPage: number, totalPages: number) => {
      if (!doc) return;
      await supabase
        .from("pdf_documents")
        .update({
          annotations,
          last_page: lastPage,
          page_count: totalPages,
          last_opened_at: new Date().toISOString(),
        })
        .eq("id", doc.id);
    },
    [doc, supabase]
  );

  if (errorMsg) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC] p-4 text-sm text-red-600">
        {errorMsg}
      </div>
    );
  }

  if (!doc || !pdfBlob) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8FAFC] text-sm text-slate-500">
        PDF লোড হচ্ছে...
      </div>
    );
  }

  return (
    <PdfEditorCanvas
      doc={doc}
      pdfBlob={pdfBlob}
      onBack={() => router.push("/documents")}
      onSaveState={handleSaveState}
    />
  );
}
