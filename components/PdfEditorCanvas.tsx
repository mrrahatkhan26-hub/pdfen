"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  ArrowLeft,
  Save,
  Maximize2,
  Minimize2,
  MousePointer,
  Pen,
  Highlighter,
  Eraser,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Plus,
  Move,
} from "lucide-react";
import {
  AnnotationItem,
  PdfDocumentRecord,
  StrokeAnnotation,
  TextAnnotation,
  TextStyleConfig,
  ToolMode,
} from "@/lib/types";
import TextStylePopover from "./TextStylePopover";
import { downloadCompositePagePng } from "@/lib/exportAnnotatedPdf";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
}

const DEFAULT_STYLE_KEY = "pdf_notes_default_text_style_v1";

const INITIAL_TEXT_STYLE: TextStyleConfig = {
  fontSize: 18,
  textColor: "#111827",
  backgroundColor: "#FEF08A",
  bold: false,
  italic: false,
  underline: false,
  align: "left",
  fontFamily: "Tiro Bangla",
};

const PEN_COLORS = ["#111827", "#DC2626", "#2563EB", "#16A34A"];
const HIGHLIGHT_COLORS = ["#FACC15", "#4ADE80", "#38BDF8", "#F472B6"];

interface Props {
  doc: PdfDocumentRecord;
  pdfBlob: Blob;
  onBack: () => void;
  onSaveState: (
    annotations: AnnotationItem[],
    lastPage: number,
    totalPages: number
  ) => Promise<void>;
}

export default function PdfEditorCanvas({
  doc,
  pdfBlob,
  onBack,
  onSaveState,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageBoxRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const pageCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const overlayCanvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const textLayerRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const activeStrokeRef = useRef<StrokeAnnotation | null>(null);
  const brushColorInputRef = useRef<HTMLInputElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);

  const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState<number>(doc.page_count || 1);
  const [currentPage, setCurrentPage] = useState<number>(doc.last_page || 1);
  const [pageInput, setPageInput] = useState<string>(String(doc.last_page || 1));
  const [zoom, setZoom] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [tool, setTool] = useState<ToolMode>("select");
  // পেন ও হাইলাইটারের ডিফল্ট কালার এবং সাইজ
  const [penColor, setPenColor] = useState<string>("#2563EB"); // ডিফল্ট গাঢ় নীল
  const [penSize, setPenSize] = useState<number>(2.5);         // ডিফল্ট ২.৫ পিক্সেল (কলমের মতো)

  const [highlightColor, setHighlightColor] = useState<string>("#FEF08A"); // ডিফল্ট সফট ইয়েলো
  const [highlightSize, setHighlightSize] = useState<number>(18);          // ডিফল্ট ১৮ পিক্সেল (এক লাইনের সমান)
  const [brushSettingsLoaded, setBrushSettingsLoaded] = useState<boolean>(false);

  // ব্রাশ সেটিংস লোকালস্টোরেজ থেকে লোড করা
  useEffect(() => {
    try {
      const savedPenColor = localStorage.getItem("sohoje_pen_color");
      const savedPenSize = localStorage.getItem("sohoje_pen_size");
      const savedHighlightColor = localStorage.getItem("sohoje_highlight_color");
      const savedHighlightSize = localStorage.getItem("sohoje_highlight_size");

      if (savedPenColor) setPenColor(savedPenColor);
      if (savedPenSize) setPenSize(Number(savedPenSize));
      if (savedHighlightColor) setHighlightColor(savedHighlightColor);
      if (savedHighlightSize) setHighlightSize(Number(savedHighlightSize));
    } catch {
      // ignore
    }
    setBrushSettingsLoaded(true);
  }, []);

  // পরিবর্তন হলে স্বয়ংক্রিয়ভাবে লোকালস্টোরেজে সেভ করা
  useEffect(() => {
    if (!brushSettingsLoaded) return;
    try {
      localStorage.setItem("sohoje_pen_color", penColor);
      localStorage.setItem("sohoje_pen_size", String(penSize));
      localStorage.setItem("sohoje_highlight_color", highlightColor);
      localStorage.setItem("sohoje_highlight_size", String(highlightSize));
    } catch {
      // ignore
    }
  }, [penColor, penSize, highlightColor, highlightSize, brushSettingsLoaded]);

  const [showTextPopover, setShowTextPopover] = useState<boolean>(false);
  const [defaultTextStyle, setDefaultTextStyle] = useState<TextStyleConfig>(INITIAL_TEXT_STYLE);
  const [activeTextStyle, setActiveTextStyle] = useState<TextStyleConfig>(INITIAL_TEXT_STYLE);
  const [savedDefaultNotice, setSavedDefaultNotice] = useState<boolean>(false);

  const [annotations, setAnnotations] = useState<AnnotationItem[]>(doc.annotations || []);
  const [history, setHistory] = useState<AnnotationItem[][]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationItem[][]>([]);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [movingTextId, setMovingTextId] = useState<string | null>(null);
  const [draftCursor, setDraftCursor] = useState<{ page: number; x: number; y: number } | null>(
    null
  );
  const [draftValue, setDraftValue] = useState<string>("");
  const [measuredWidthPx, setMeasuredWidthPx] = useState<number>(28);

  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving..." | "Unsaved">("Saved");
  const [draggingThumb, setDraggingThumb] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DEFAULT_STYLE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TextStyleConfig;
        const normalized: TextStyleConfig = { ...parsed, fontFamily: "Tiro Bangla" };
        setDefaultTextStyle(normalized);
        setActiveTextStyle(normalized);
      }
    } catch {
      // ignore
    }
  }, []);

  // লেখার আসল পিক্সেল প্রস্থ মেপে নেওয়া (যাতে ব্যাকগ্রাউন্ড শুধু লেখার নিচে থাকে)
  useEffect(() => {
    if (!measureRef.current) return;
    const w = measureRef.current.offsetWidth;
    setMeasuredWidthPx(Math.max(24, w + 14));
  }, [draftValue, activeTextStyle, editingTextId, annotations]);

  useEffect(() => {
    let active = true;
    (async () => {
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      if (!active) return;
      setPdfProxy(pdf);
      setPageCount(pdf.numPages);
    })();
    return () => {
      active = false;
    };
  }, [pdfBlob]);

  const drawPageStrokes = useCallback(
    (pageNum: number, draftStroke?: StrokeAnnotation | null) => {
      const overlay = overlayCanvasRefs.current[pageNum];
      if (!overlay) return;
      const ctx = overlay.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, overlay.width, overlay.height);

      const pageStrokes = annotations.filter(
        (a): a is StrokeAnnotation =>
          (a.type === "pen" || a.type === "highlighter") && a.page === pageNum
      );
      const list =
        draftStroke && draftStroke.page === pageNum ? [...pageStrokes, draftStroke] : pageStrokes;

      for (const s of list) {
        if (!s.points.length) continue;
        ctx.save();
        ctx.beginPath();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        if (s.type === "highlighter") {
          ctx.globalAlpha = 0.35;
          ctx.strokeStyle = s.color || "#FACC15";
          ctx.lineWidth = s.width * zoom;
        } else {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = s.color || "#111827";
          ctx.lineWidth = s.width * zoom;
        }

        s.points.forEach((pt, idx) => {
          const px = pt.x * overlay.width;
          const py = pt.y * overlay.height;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
      }
    },
    [annotations, zoom]
  );

  const renderTasksRef = useRef<Record<number, any>>({});

  useEffect(() => {
    if (!pdfProxy) return;
    let isCancelled = false;

    for (let p = 1; p <= pageCount; p++) {
      const pageNum = p;
      const canvas = pageCanvasRefs.current[pageNum];
      const overlay = overlayCanvasRefs.current[pageNum];
      if (!canvas) continue;

      pdfProxy.getPage(pageNum).then((page) => {
        if (isCancelled) return;

        // ফিক্স ২: হাই-ডিপিআই রেন্ডারিং — DPR দিয়ে ক্যানভাসের আসল পিক্সেল বাড়ানো
        const dpr = Math.max(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
        const viewport = page.getViewport({ scale: 1.5 * zoom });

        // ক্যানভাসের আসল পিক্সেল DPR গুণ বেশি (রেটিনা-শার্প)
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        // CSS আকার ভিউপোর্টের সমান রাখা
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        if (overlay) {
          overlay.width = Math.floor(viewport.width * dpr);
          overlay.height = Math.floor(viewport.height * dpr);
          overlay.style.width = `${viewport.width}px`;
          overlay.style.height = `${viewport.height}px`;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          if (renderTasksRef.current[pageNum]) {
            try { renderTasksRef.current[pageNum].cancel(); } catch { /* ignore */ }
          }

          // ফিক্স ১ ও ২: টেক্সট লেয়ার রেন্ডার করা
          const textLayerDiv = textLayerRefs.current[pageNum];
          if (textLayerDiv) {
            // পুরনো টেক্সট লেয়ার ক্লিয়ার করা
            textLayerDiv.innerHTML = "";
            textLayerDiv.style.width = `${viewport.width}px`;
            textLayerDiv.style.height = `${viewport.height}px`;

            const textLayer = new pdfjsLib.TextLayer({
              textContentSource: page.streamTextContent(),
              container: textLayerDiv,
              viewport,
            });
            textLayer.render().catch(() => { /* ignore cancel */ });
          }

          const task = page.render({
            canvasContext: ctx,
            canvas,
            viewport,
            // DPR transform: ক্যানভাস কো-অর্ডিনেট সিস্টেম স্কেল করা
            transform: [dpr, 0, 0, dpr, 0, 0],
          });
          renderTasksRef.current[pageNum] = task;
          task.promise
            .then(() => { if (!isCancelled) drawPageStrokes(pageNum); })
            .catch(() => { /* cancellation */ });
        }
      });
    }

    return () => {
      isCancelled = true;
      Object.values(renderTasksRef.current).forEach((task: any) => {
        try {
          task?.cancel();
        } catch {
          // ignore
        }
      });
    };
  }, [pdfProxy, pageCount, zoom, drawPageStrokes]);

  const commitAnnotations = useCallback(
    (next: AnnotationItem[]) => {
      setHistory((h) => [...h.slice(-29), annotations]);
      setRedoStack([]);
      setAnnotations(next);
      setSaveStatus("Unsaved");
    },
    [annotations]
  );

  const handleTextStyleChange = (next: TextStyleConfig) => {
    const updated: TextStyleConfig = { ...next, fontFamily: "Tiro Bangla" };
    setActiveTextStyle(updated);
    if (selectedTextId) {
      setAnnotations((prev) =>
        prev.map((item) =>
          item.id === selectedTextId && item.type === "text"
            ? { ...item, style: { ...updated } }
            : item
        )
      );
      setSaveStatus("Unsaved");
    }
  };

  useEffect(() => {
    if (saveStatus === "Saved") return;
    const timer = setTimeout(async () => {
      setSaveStatus("Saving...");
      await onSaveState(annotations, currentPage, pageCount);
      setSaveStatus("Saved");
    }, 1500);
    return () => clearTimeout(timer);
  }, [annotations, currentPage, pageCount, saveStatus, onSaveState]);

  const handleManualSave = async () => {
    setSaveStatus("Saving...");
    await onSaveState(annotations, currentPage, pageCount);
    setSaveStatus("Saved");
  };

  const handleUndo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [...r, annotations]);
    setHistory((h) => h.slice(0, -1));
    setAnnotations(prev);
    setSaveStatus("Unsaved");
  };

  const handleRedo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((h) => [...h, annotations]);
    setRedoStack((r) => r.slice(0, -1));
    setAnnotations(next);
    setSaveStatus("Unsaved");
  };

  const goToPage = (targetPage: number) => {
    const clamped = Math.max(1, Math.min(pageCount, targetPage));
    setCurrentPage(clamped);
    setPageInput(String(clamped));
    setSaveStatus("Unsaved");
    pageBoxRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleScroll = () => {
    if (draggingThumb) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const containerTop = container.getBoundingClientRect().top;

    let closestPage = currentPage;
    let minDist = Infinity;

    for (let p = 1; p <= pageCount; p++) {
      const el = pageBoxRefs.current[p];
      if (!el) continue;
      const dist = Math.abs(el.getBoundingClientRect().top - containerTop - 40);
      if (dist < minDist) {
        minDist = dist;
        closestPage = p;
      }
    }

    if (closestPage !== currentPage) {
      setCurrentPage(closestPage);
      setPageInput(String(closestPage));
      setSaveStatus("Unsaved");
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => {
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        return Math.max(0.5, Math.min(3, Number((z + delta).toFixed(2))));
      });
    }
  };

  const handleThumbMove = (clientY: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    container.scrollTop = ratio * (container.scrollHeight - container.clientHeight);
    const targetPage = Math.max(1, Math.min(pageCount, Math.round(ratio * (pageCount - 1)) + 1));
    setCurrentPage(targetPage);
    setPageInput(String(targetPage));
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.().catch(() => { });
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.().catch(() => { });
      setIsFullscreen(false);
    }
  };

  const selectTool = (nextTool: ToolMode) => {
    setTool(nextTool);
    setEditingTextId(null);
    if (nextTool === "text") {
      setActiveTextStyle({ ...defaultTextStyle, fontFamily: "Tiro Bangla" });
      setShowTextPopover(true);
    } else {
      setShowTextPopover(false);
      setDraftCursor(null);
      setDraftValue("");
    }
  };

  const getNormPoint = (pageNum: number, clientX: number, clientY: number) => {
    const box = pageBoxRefs.current[pageNum];
    if (!box) return { x: 0, y: 0 };
    const rect = box.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (pageNum: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (movingTextId) return;

    if (tool === "pen" || tool === "highlighter") {
      e.currentTarget.setPointerCapture(e.pointerId);
      const pt = getNormPoint(pageNum, e.clientX, e.clientY);
      activeStrokeRef.current = {
        id: crypto.randomUUID(),
        type: tool,
        page: pageNum,
        color: tool === "highlighter" ? highlightColor : penColor,
        width: tool === "highlighter" ? highlightSize : penSize,
        points: [pt],
      };
      drawPageStrokes(pageNum, activeStrokeRef.current);
      return;
    }

    if (tool === "eraser") {
      const pt = getNormPoint(pageNum, e.clientX, e.clientY);
      const filtered = annotations.filter((item) => {
        if (item.page !== pageNum) return true;
        if (item.type === "pen" || item.type === "highlighter") {
          const hit = item.points.some(
            (p) => Math.hypot(p.x - pt.x, p.y - pt.y) < 0.025
          );
          return !hit;
        }
        if (item.type === "text") {
          const hitText =
            Math.abs(item.x - pt.x) < 0.06 && Math.abs(item.y - pt.y) < 0.04;
          return !hitText;
        }
        return true;
      });
      if (filtered.length !== annotations.length) {
        commitAnnotations(filtered);
      }
    }
  };

  const handlePointerMove = (pageNum: number, e: React.PointerEvent<HTMLDivElement>) => {
    if (movingTextId) {
      const pt = getNormPoint(pageNum, e.clientX, e.clientY);
      setAnnotations((prev) =>
        prev.map((item) =>
          item.id === movingTextId && item.type === "text"
            ? { ...item, x: pt.x, y: pt.y }
            : item
        )
      );
      return;
    }

    if (!activeStrokeRef.current) return;
    const pt = getNormPoint(pageNum, e.clientX, e.clientY);
    activeStrokeRef.current.points.push(pt);
    drawPageStrokes(pageNum, activeStrokeRef.current);
  };

  const handlePointerUp = (pageNum: number) => {
    if (movingTextId) {
      setMovingTextId(null);
      setSaveStatus("Unsaved");
      return;
    }

    if (!activeStrokeRef.current) return;
    const finished = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (finished.points.length > 1) {
      commitAnnotations([...annotations, finished]);
    } else {
      drawPageStrokes(pageNum);
    }
  };

  const handlePageClick = (pageNum: number, e: React.MouseEvent<HTMLDivElement>) => {
    const pt = getNormPoint(pageNum, e.clientX, e.clientY);

    if (tool === "text") {
      setDraftCursor({ page: pageNum, x: pt.x, y: pt.y });
      setDraftValue("");
      setSelectedTextId(null);
    } else if (tool === "select") {
      setSelectedTextId(null);
      setEditingTextId(null);
    }
  };

  const finalizeDraftText = (content: string) => {
    if (!draftCursor) return;
    const trimmed = content.trim();
    if (trimmed) {
      const newText: TextAnnotation = {
        id: crypto.randomUUID(),
        type: "text",
        page: draftCursor.page,
        x: draftCursor.x,
        y: draftCursor.y,
        maxWidth: 0.9,
        content,
        style: { ...activeTextStyle, fontFamily: "Tiro Bangla" },
      };
      commitAnnotations([...annotations, newText]);
    }
    setDraftCursor(null);
    setDraftValue("");
  };

  const updateTextAnnotation = (id: string, content: string) => {
    setAnnotations((prev) =>
      prev.map((item) =>
        item.id === id && item.type === "text" ? { ...item, content } : item
      )
    );
    setSaveStatus("Unsaved");
  };

  const finishEditingText = (id: string, currentContent: string) => {
    setEditingTextId(null);
    // সব লেখা মুছে দিয়ে বের হলে বক্সটি মুছে যাবে
    if (!currentContent.trim()) {
      commitAnnotations(annotations.filter((item) => item.id !== id));
      if (selectedTextId === id) setSelectedTextId(null);
    }
  };

  const deleteSelectedText = (id: string) => {
    commitAnnotations(annotations.filter((item) => item.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
    if (editingTextId === id) setEditingTextId(null);
  };

  const saveStyleAsDefault = () => {
    const normalized: TextStyleConfig = { ...activeTextStyle, fontFamily: "Tiro Bangla" };
    setDefaultTextStyle(normalized);
    try {
      localStorage.setItem(DEFAULT_STYLE_KEY, JSON.stringify(normalized));
    } catch {
      // ignore
    }
    setSavedDefaultNotice(true);
    setTimeout(() => setSavedDefaultNotice(false), 1800);
  };

  const handleDownloadCurrentPage = () => {
    const baseCanvas = pageCanvasRefs.current[currentPage];
    if (!baseCanvas) return;
    downloadCompositePagePng(baseCanvas, annotations, currentPage, doc.title);
  };

  const isDrawingTool = tool === "pen" || tool === "highlighter" || tool === "eraser";
  const activeBrushColor = tool === "pen" ? penColor : highlightColor;
  const activeBrushSize = tool === "pen" ? penSize : highlightSize;

  const editingItem = annotations.find(
    (a): a is TextAnnotation => a.type === "text" && a.id === editingTextId
  );
  const measureText = draftCursor ? draftValue || " " : editingItem ? editingItem.content || " " : " ";
  const measureStyle = editingItem ? editingItem.style : activeTextStyle;

  return (
    <div className="relative flex h-screen w-screen flex-col bg-[#262626] text-slate-100 select-none">
      {/* Hidden text width measurer */}
      <span
        ref={measureRef}
        aria-hidden="true"
        style={{
          fontSize: `${measureStyle.fontSize}px`,
          fontFamily: `"Tiro Bangla", sans-serif`,
          fontWeight: measureStyle.bold ? 700 : 400,
          fontStyle: measureStyle.italic ? "italic" : "normal",
          whiteSpace: "pre",
        }}
        className="pointer-events-none fixed -top-[9999px] left-0"
      >
        {measureText}
      </span>

      <header className="z-30 flex items-center justify-between bg-stone-900 px-3 py-2 text-white shadow">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-1.5 hover:bg-stone-800"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          {!isFullscreen && (
            <span className="max-w-[140px] truncate text-sm font-medium">{doc.title}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <input
            type="number"
            min={1}
            max={pageCount}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") goToPage(Number(pageInput) || 1);
            }}
            onBlur={() => goToPage(Number(pageInput) || 1)}
            className="w-12 rounded bg-stone-800 px-1.5 py-1 text-center text-white border border-stone-700"
          />
          <span className="text-stone-300">of {pageCount}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline text-xs text-amber-300">{saveStatus}</span>
          {!isFullscreen && (
            <button
              type="button"
              onClick={handleDownloadCurrentPage}
              className="rounded-lg bg-stone-800 p-1.5 text-stone-200 hover:bg-stone-700"
              title="Download current page with edits"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleManualSave}
            className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-stone-950 hover:bg-amber-400"
          >
            <Save className="h-4 w-4" />
            <span>Save</span>
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="rounded-lg bg-stone-800 p-1.5 text-amber-300 hover:bg-stone-700"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onWheel={handleWheel}
        className="relative flex-1 overflow-auto px-2 py-4 touch-pan-x touch-pan-y bg-[#262626]"
      >
        <div className="mx-auto flex flex-col items-center gap-4 bg-[#262626]">
          {Array.from({ length: pageCount }, (_, idx) => idx + 1).map((pageNum) => {
            const pageTexts = annotations.filter(
              (a): a is TextAnnotation => a.type === "text" && a.page === pageNum
            );

            return (
              <div
                key={pageNum}
                ref={(el) => {
                  pageBoxRefs.current[pageNum] = el;
                }}
                onClick={(e) => handlePageClick(pageNum, e)}
                onPointerDown={(e) => handlePointerDown(pageNum, e)}
                onPointerMove={(e) => handlePointerMove(pageNum, e)}
                onPointerUp={() => handlePointerUp(pageNum)}
                className={`relative bg-white shadow-2xl ${isDrawingTool ? "touch-none" : ""}`}
              >
                {/* ফিক্স ২: হাই-ডিপিআই PDF ক্যানভাস — pointer-events-none যাতে select টুলে টেক্সট সিলেক্ট হয় */}
                <canvas
                  ref={(el) => {
                    pageCanvasRefs.current[pageNum] = el;
                  }}
                  className="block pointer-events-none"
                />

                {/* ফিক্স ১: অফিসিয়াল TextLayer — ক্যানভাসের উপরে z-10, টেক্সট সিলেক্ট ও কপি করা যাবে */}
                <div
                  ref={(el) => { textLayerRefs.current[pageNum] = el; }}
                  className={`textLayer absolute inset-0 z-10 ${
                    tool === "select"
                      ? "pointer-events-auto select-text"
                      : "pointer-events-none select-none"
                  }`}
                  style={{ overflow: "hidden" }}
                />

                {/* ড্রয়িং ওভারলে ক্যানভাস: select মোডে pointer-events-none, বাকি সময় auto */}
                <canvas
                  ref={(el) => {
                    overlayCanvasRefs.current[pageNum] = el;
                  }}
                  className={`absolute inset-0 h-full w-full z-20 ${
                    tool === "select" ? "pointer-events-none" : "pointer-events-auto"
                  }`}
                />

                {/* নতুন টেক্সট লেখা: শুধু লেখা যতটুকু জায়গা নেয় ততটুকুর নিচে ব্যাকগ্রাউন্ড */}
                {draftCursor && draftCursor.page === pageNum && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      left: `${draftCursor.x * 100}%`,
                      top: `${draftCursor.y * 100}%`,
                    }}
                    className="absolute z-20"
                  >
                    <textarea
                      autoFocus
                      rows={1}
                      spellCheck={false}
                      value={draftValue}
                      onChange={(e) => {
                        setDraftValue(e.target.value);
                        e.currentTarget.style.height = "auto";
                        e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                      }}
                      onBlur={(e) => finalizeDraftText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          finalizeDraftText(e.currentTarget.value);
                        } else if (e.key === "Escape") {
                          setDraftCursor(null);
                          setDraftValue("");
                        }
                      }}
                      style={{
                        width: `${measuredWidthPx}px`,
                        fontSize: `${activeTextStyle.fontSize}px`,
                        color: activeTextStyle.textColor,
                        backgroundColor: activeTextStyle.backgroundColor,
                        fontFamily: `"Tiro Bangla", sans-serif`,
                        fontWeight: activeTextStyle.bold ? 700 : 400,
                        fontStyle: activeTextStyle.italic ? "italic" : "normal",
                        textDecoration: activeTextStyle.underline ? "underline" : "none",
                        textAlign: activeTextStyle.align,
                        caretColor: "#D97706",
                      }}
                      className="block resize-none overflow-hidden border-none px-1.5 py-0.5 leading-snug outline-none whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                    />
                  </div>
                )}

                {/* সেভ করা টেক্সট: ডাবল ট্যাপে এডিট + উপরের বাম কোণায় Move ও Delete আইকন */}
                {pageTexts.map((txt) => {
                  const isEditing = editingTextId === txt.id;
                  const isSelected = selectedTextId === txt.id;

                  return (
                    <div
                      key={txt.id}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingTextId(txt.id);
                        setSelectedTextId(txt.id);
                        setActiveTextStyle({ ...txt.style, fontFamily: "Tiro Bangla" });
                        setShowTextPopover(true);
                      }}
                      style={{
                        left: `${txt.x * 100}%`,
                        top: `${txt.y * 100}%`,
                      }}
                      className={`absolute z-10 ${isEditing ? "ring-1 ring-amber-500/70" : ""
                        }`}
                    >
                      {(isEditing || isSelected) && (
                        <div className="mb-0.5 flex items-center gap-1">
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              setSelectedTextId(txt.id);
                              setMovingTextId(txt.id);
                            }}
                            className="flex h-5 w-5 cursor-grab items-center justify-center rounded bg-stone-900 text-white shadow hover:bg-stone-800"
                            title="Move"
                          >
                            <Move className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSelectedText(txt.id);
                            }}
                            className="flex h-5 w-5 items-center justify-center rounded bg-red-600 text-white shadow hover:bg-red-700"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {isEditing ? (
                        <textarea
                          autoFocus
                          rows={1}
                          spellCheck={false}
                          value={txt.content}
                          onChange={(e) => {
                            updateTextAnnotation(txt.id, e.target.value);
                            e.currentTarget.style.height = "auto";
                            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                          }}
                          onBlur={(e) => finishEditingText(txt.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              finishEditingText(txt.id, e.currentTarget.value);
                            }
                          }}
                          style={{
                            width: `${measuredWidthPx}px`,
                            fontSize: `${txt.style.fontSize}px`,
                            color: txt.style.textColor,
                            backgroundColor: txt.style.backgroundColor,
                            fontFamily: `"Tiro Bangla", sans-serif`,
                            fontWeight: txt.style.bold ? 700 : 400,
                            fontStyle: txt.style.italic ? "italic" : "normal",
                            textDecoration: txt.style.underline ? "underline" : "none",
                            textAlign: txt.style.align,
                            caretColor: "#D97706",
                          }}
                          className="block resize-none overflow-hidden px-1.5 py-0.5 leading-snug outline-none whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: `${txt.style.fontSize}px`,
                            color: txt.style.textColor,
                            backgroundColor: txt.style.backgroundColor,
                            fontFamily: `"Tiro Bangla", sans-serif`,
                            fontWeight: txt.style.bold ? 700 : 400,
                            fontStyle: txt.style.italic ? "italic" : "normal",
                            textDecoration: txt.style.underline ? "underline" : "none",
                            textAlign: txt.style.align,
                          }}
                          className="inline-block whitespace-pre-wrap break-words [overflow-wrap:anywhere] px-1.5 py-0.5 leading-snug"
                        >
                          {txt.content}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div
          onPointerDown={(e) => {
            e.preventDefault();
            setDraggingThumb(true);
            handleThumbMove(e.clientY);
          }}
          onPointerMove={(e) => {
            if (draggingThumb) handleThumbMove(e.clientY);
          }}
          onPointerUp={() => setDraggingThumb(false)}
          className="fixed right-1.5 top-20 bottom-24 z-20 flex w-5 cursor-grab items-center justify-center touch-none"
        >
          <div className="h-14 w-1.5 rounded-full bg-amber-500/80 shadow" />
          {draggingThumb && (
            <div className="absolute right-7 rounded-full bg-stone-900 px-2.5 py-1 text-xs font-semibold text-white shadow">
              {currentPage} / {pageCount}
            </div>
          )}
        </div>
      </div>

      <footer className="z-30 border-t border-stone-200 bg-[#FFFDF9] px-3 py-2">
        {(tool === "pen" || tool === "highlighter") && (
          <div className="mb-2 flex flex-wrap items-center justify-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              {(tool === "pen" ? PEN_COLORS : HIGHLIGHT_COLORS).map((c) => {
                const active = activeBrushColor === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => (tool === "pen" ? setPenColor(c) : setHighlightColor(c))}
                    style={{ backgroundColor: c }}
                    className={`h-6 w-6 rounded-full border ${active ? "ring-2 ring-amber-500 scale-110" : "border-stone-300"
                      }`}
                    aria-label={`Color ${c}`}
                  />
                );
              })}

              <button
                type="button"
                onClick={() => brushColorInputRef.current?.click()}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-stone-400 bg-white text-stone-700 hover:border-amber-500"
                title="Custom brush color"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <input
                ref={brushColorInputRef}
                type="color"
                value={activeBrushColor}
                onChange={(e) =>
                  tool === "pen"
                    ? setPenColor(e.target.value)
                    : setHighlightColor(e.target.value)
                }
                className="sr-only"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-stone-500">Size:</span>
              <input
                type="range"
                min={tool === "pen" ? 1 : 8}
                max={tool === "pen" ? 14 : 40}
                step={0.5}
                value={activeBrushSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (tool === "pen") setPenSize(val);
                  else setHighlightSize(val);
                }}
                className="w-24 accent-amber-500"
              />
              <span className="w-7 text-right font-mono text-[11px] text-stone-700">
                {activeBrushSize}
              </span>
            </div>
          </div>
        )}

        {showTextPopover && tool === "text" && (
          <TextStylePopover
            style={activeTextStyle}
            onChange={handleTextStyleChange}
            onSaveAsDefault={saveStyleAsDefault}
            savedNotice={savedDefaultNotice}
          />
        )}

        <div className="mx-auto flex max-w-xl items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => selectTool("select")}
            className={`rounded-xl p-2.5 ${tool === "select" ? "bg-amber-400 text-stone-950" : "hover:bg-stone-100"
              }`}
            title="Select & Scroll"
          >
            <MousePointer className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => selectTool("pen")}
            className={`rounded-xl p-2.5 ${tool === "pen" ? "bg-amber-400 text-stone-950" : "hover:bg-stone-100"
              }`}
            title="Pen"
          >
            <Pen className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => selectTool("highlighter")}
            className={`rounded-xl p-2.5 ${tool === "highlighter" ? "bg-amber-400 text-stone-950" : "hover:bg-stone-100"
              }`}
            title="Highlighter"
          >
            <Highlighter className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => selectTool("eraser")}
            className={`rounded-xl p-2.5 ${tool === "eraser" ? "bg-amber-400 text-stone-950" : "hover:bg-stone-100"
              }`}
            title="Eraser"
          >
            <Eraser className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => selectTool("text")}
            className={`rounded-xl p-2.5 ${tool === "text" ? "bg-amber-400 text-stone-950" : "hover:bg-stone-100"
              }`}
            title="Text"
          >
            <Type className="h-5 w-5" />
          </button>

          <div className="h-6 w-px bg-stone-200" />

          <button
            type="button"
            onClick={handleUndo}
            disabled={!history.length}
            className="rounded-xl p-2.5 disabled:opacity-35 hover:bg-stone-100"
            title="Undo"
          >
            <Undo2 className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={handleRedo}
            disabled={!redoStack.length}
            className="rounded-xl p-2.5 disabled:opacity-35 hover:bg-stone-100"
            title="Redo"
          >
            <Redo2 className="h-5 w-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
