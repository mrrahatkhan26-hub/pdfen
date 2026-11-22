'use client';

import React from 'react';
import OfficialPdfViewer from './OfficialPdfViewer';

interface FastPdfReaderProps {
  bookId: string;
  pdfUrl: string;
  zoom?: number;
  activeTool?: 'select' | 'pen' | 'highlighter' | 'eraser' | 'text';
}

export default function FastPdfReader({
  bookId,
  pdfUrl,
  zoom = 1,
}: FastPdfReaderProps) {
  return <OfficialPdfViewer bookId={bookId} pdfUrl={pdfUrl} zoom={zoom} />;
}
