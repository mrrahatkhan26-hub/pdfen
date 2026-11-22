'use client';

import 'pdfjs-dist/web/pdf_viewer.css';
import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  EventBus,
  PDFLinkService,
  PDFViewer,
} from 'pdfjs-dist/web/pdf_viewer.mjs';
import { get, set } from 'idb-keyval';

if (typeof window !== "undefined") {
  // লোকাল public/ থেকে লোড — অফলাইন PWA সাপোর্ট, কোনো CDN নির্ভরতা নেই
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface OfficialPdfViewerProps {
  bookId: string;
  pdfUrl: string;
  zoom?: number | 'page-width' | 'auto';
  onPageChange?: (page: number, totalPages: number) => void;
  /** প্রতিটি পেজের ওপর কাস্টম অ্যানোটেশন ওভারলে বসানোর জন্য */
  renderPageOverlay?: (pageNumber: number, pageDiv: HTMLElement) => void;
}

export default function OfficialPdfViewer({
  bookId,
  pdfUrl,
  zoom = 'page-width',
  onPageChange,
}: OfficialPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<PDFViewer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalPages, setTotalPages] = useState<number>(0);

  // ১. অফিসিয়াল PDFViewer ইনিশিয়ালাইজেশন
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDestroyed = false;
    let activeObjectUrl: string | null = null;

    const eventBus = new EventBus();
    const linkService = new PDFLinkService({ eventBus });

    const pdfViewer = new PDFViewer({
      container,
      eventBus,
      linkService,
      textLayerMode: 2, // 2 = Enhanced Text Layer (নিখুঁত বাংলা ও আরবি টেক্সট সিলেকশন)
      annotationMode: 2,
      removePageBorders: false,
      maxCanvasPixels: 16777216 * 2, // হাই-ডিপিআই ক্রিস্টাল ক্লিয়ার রেন্ডারিং
    });

    linkService.setViewer(pdfViewer);
    viewerRef.current = pdfViewer;

    // পেজ পরিবর্তন হলে অটো-সেভ ও কলব্যাক
    eventBus.on('pagechanging', (evt: { pageNumber: number }) => {
      localStorage.setItem(`sohoje_last_page_${bookId}`, String(evt.pageNumber));
      if (onPageChange && pdfViewer.pagesCount) {
        onPageChange(evt.pageNumber, pdfViewer.pagesCount);
      }
    });

    // প্রথম পেজ রেন্ডার হওয়ার সাথে সাথে ডিফল্ট জুম ও লাস্ট পেজ সেট করা
    eventBus.on('pagesinit', () => {
      pdfViewer.currentScaleValue = String(zoom);
      const savedPage = Number(localStorage.getItem(`sohoje_last_page_${bookId}`));
      if (savedPage > 1 && savedPage <= pdfViewer.pagesCount) {
        pdfViewer.currentPageNumber = savedPage;
      }
    });

    async function loadPdf() {
      try {
        setIsLoading(true);
        const cacheKey = `sohoje-pdf-full-${bookId}`;
        const cachedBuffer = await get<ArrayBuffer>(cacheKey);

        let sourceParam: { url: string; rangeChunkSize?: number; disableAutoFetch?: boolean };

        if (cachedBuffer) {
          const blob = new Blob([cachedBuffer], { type: 'application/pdf' });
          activeObjectUrl = URL.createObjectURL(blob);
          sourceParam = { url: activeObjectUrl };
        } else {
          sourceParam = {
            url: pdfUrl,
            rangeChunkSize: 65536, // ৬৪ KB চাংক স্ট্রিমিং
            disableAutoFetch: true,
          };
        }

        const loadingTask = pdfjsLib.getDocument(sourceParam);
        const pdfDocument = await loadingTask.promise;

        if (isDestroyed) return;

        pdfViewer.setDocument(pdfDocument);
        linkService.setDocument(pdfDocument, null);
        setTotalPages(pdfDocument.numPages);
        setIsLoading(false);

        if (onPageChange) {
          const initialPage =
            Number(localStorage.getItem(`sohoje_last_page_${bookId}`)) || 1;
          onPageChange(initialPage, pdfDocument.numPages);
        }

        // ব্যাকগ্রাউন্ডে অফলাইন ব্যবহারের জন্য IndexedDB-তে সেভ
        if (!cachedBuffer) {
          const data = await pdfDocument.getData();
          await set(cacheKey, data.buffer);
        }
      } catch (err) {
        console.error('PDF load error:', err);
        setIsLoading(false);
      }
    }

    loadPdf();

    // উইন্ডো রিসাইজ হলে অটো-ফিট
    const handleResize = () => {
      if (viewerRef.current && zoom === 'page-width') {
        viewerRef.current.currentScaleValue = 'page-width';
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDestroyed = true;
      window.removeEventListener('resize', handleResize);
      if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    };
  }, [bookId, pdfUrl]);

  // ২. জুম পরিবর্তন হলে সরাসরি ভেক্টর স্কেলে আপডেট (CSS transform নয়)
  useEffect(() => {
    if (viewerRef.current && totalPages > 0) {
      viewerRef.current.currentScaleValue = String(zoom);
    }
  }, [zoom, totalPages]);

  return (
    <div className="relative w-full h-full bg-[#F8FAFC] overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#F8FAFC] text-slate-600 text-sm">
          লোড হচ্ছে...
        </div>
      )}

      {/* অফিসিয়াল PDFViewer-এর জন্য position: absolute কন্টেইনার বাধ্যতামূলক */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-auto px-3 pt-4 pb-28"
      >
        <div id="viewer" className="pdfViewer" />
      </div>
    </div>
  );
}
