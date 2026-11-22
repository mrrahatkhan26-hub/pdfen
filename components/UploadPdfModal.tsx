'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { uploadPdfToStorage, UploadPdfResult } from '@/lib/uploadPdf';

interface UploadPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded?: (result: UploadPdfResult & { originalFile: File }) => Promise<void> | void;
}

export default function UploadPdfModal({
  isOpen,
  onClose,
  onUploaded,
}: UploadPdfModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFilePick = (file: File | undefined | null) => {
    setErrorMsg(null);
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMsg('দয়া করে একটি বৈধ PDF ফাইল নির্বাচন করুন।');
      return;
    }

    setSelectedFile(file);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFilePick(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isUploading) return;
    handleFilePick(e.dataTransfer.files?.[0]);
  };

  const handleStartUpload = async () => {
    if (!selectedFile || isUploading) return;

    try {
      setIsUploading(true);
      setErrorMsg(null);
      setProgress(5);

      const uploaded = await uploadPdfToStorage(selectedFile, (pct) => {
        setProgress(pct);
      });

      if (onUploaded) {
        await onUploaded({ ...uploaded, originalFile: selectedFile });
      }

      setSelectedFile(null);
      setProgress(0);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'ফাইল আপলোড করতে সমস্যা হয়েছে।';
      setErrorMsg(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setErrorMsg(null);
    setSelectedFile(null);
    setProgress(0);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* হেডার */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Upload PDF</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="rounded-lg px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* হিডেন ফাইল ইনপুট */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={handleInputChange}
          className="hidden"
        />

        {/* Drag & Drop ড্রপজোন */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? 'border-amber-500 bg-amber-50/70'
              : 'border-slate-300 bg-slate-50 hover:border-slate-400'
          }`}
        >
          <p className="text-sm font-medium text-slate-800">
            আপনার PDF ফাইলটি এখানে Drag & Drop করুন
          </p>
          <p className="mt-1 text-xs text-slate-500">
            অথবা নিচের বাটনে ক্লিক করে পিসি থেকে ফাইল বেছে নিন
          </p>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-400 transition-colors disabled:opacity-50"
          >
            Choose from PC
          </button>
        </div>

        {/* নির্বাচিত ফাইলের তথ্য */}
        {selectedFile && (
          <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-100 px-3.5 py-2.5 text-xs text-slate-800">
            <span className="truncate font-medium pr-2">{selectedFile.name}</span>
            <span className="shrink-0 text-slate-600">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
        )}

        {/* আপলোড প্রোগ্রেস বার */}
        {isUploading && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>আপলোড হচ্ছে...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-amber-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* এরর মেসেজ */}
        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        {/* ফুটার বাটন */}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isUploading}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartUpload}
            disabled={!selectedFile || isUploading}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isUploading ? 'Uploading...' : 'Start Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
