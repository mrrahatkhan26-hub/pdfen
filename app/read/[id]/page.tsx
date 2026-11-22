'use client';

import { use, useState } from 'react';
import dynamic from 'next/dynamic';

const OfficialPdfViewer = dynamic(() => import('@/components/OfficialPdfViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#262626] text-sm text-slate-200">
      লোড হচ্ছে...
    </div>
  ),
});

export default function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [zoom, setZoom] = useState<number | 'page-width'>('page-width');
  const [pageInfo, setPageInfo] = useState({ current: 1, total: 1 });

  // Supabase বা লোকাল PDF URL
  const pdfUrl = `/api/books/${id}/file`;

  return (
    <div className="flex flex-col w-full h-screen bg-[#262626]">
      {/* টপ বার */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 z-20">
        <div className="text-sm font-semibold text-slate-900">
          Page {pageInfo.current} / {pageInfo.total}
        </div>

        {/* জুম কন্ট্রোল */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setZoom((prev) =>
                typeof prev === 'number' ? Math.max(0.5, prev - 0.25) : 1
              )
            }
            className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded text-slate-800"
          >
            -
          </button>
          <button
            onClick={() => setZoom('page-width')}
            className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded text-slate-800"
          >
            Fit Width
          </button>
          <button
            onClick={() =>
              setZoom((prev) =>
                typeof prev === 'number' ? Math.min(3, prev + 0.25) : 1.5
              )
            }
            className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded text-slate-800"
          >
            +
          </button>
        </div>
      </header>

      {/* অফিসিয়াল PDF ভিউয়ার */}
      <main className="flex-1 relative">
        <OfficialPdfViewer
          bookId={id}
          pdfUrl={pdfUrl}
          zoom={zoom}
          onPageChange={(current, total) => setPageInfo({ current, total })}
        />
      </main>
    </div>
  );
}
