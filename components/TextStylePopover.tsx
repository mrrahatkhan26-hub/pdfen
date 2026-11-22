"use client";

import React, { useRef } from "react";
import { AlignLeft, AlignCenter, AlignRight, Plus, Ban } from "lucide-react";
import { TextStyleConfig } from "@/lib/types";

interface Props {
  style: TextStyleConfig;
  onChange: (next: TextStyleConfig) => void;
  onSaveAsDefault: () => void;
  savedNotice?: boolean;
}

const TEXT_COLORS = ["#111827", "#DC2626", "#2563EB", "#16A34A", "#D97706"];
const BG_COLORS = ["#FEF08A", "#A5F3FC", "#FBCFE8", "#BBF7D0"];

export default function TextStylePopover({
  style,
  onChange,
  onSaveAsDefault,
  savedNotice,
}: Props) {
  const textColorInputRef = useRef<HTMLInputElement | null>(null);
  const bgColorInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="mb-2 rounded-2xl border border-amber-200 bg-[#FFFDF9] p-3 shadow-lg text-xs text-stone-800">
      <div className="flex flex-wrap items-center gap-2">
        {/* Font Size */}
        <label className="flex items-center gap-1">
          <span className="text-stone-500">Size</span>
          <input
            type="number"
            min={10}
            max={72}
            value={style.fontSize}
            onChange={(e) =>
              onChange({
                ...style,
                fontFamily: "Tiro Bangla",
                fontSize: Number(e.target.value) || 18,
              })
            }
            className="w-14 rounded-lg border border-stone-300 bg-white px-2 py-1"
          />
        </label>

        {/* Bold / Italic / Underline */}
        <button
          type="button"
          onClick={() => onChange({ ...style, fontFamily: "Tiro Bangla", bold: !style.bold })}
          className={`h-7 w-7 rounded font-bold border ${
            style.bold ? "bg-amber-400 border-amber-500" : "bg-white border-stone-300"
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...style, fontFamily: "Tiro Bangla", italic: !style.italic })}
          className={`h-7 w-7 rounded italic border ${
            style.italic ? "bg-amber-400 border-amber-500" : "bg-white border-stone-300"
          }`}
        >
          I
        </button>
        <button
          type="button"
          onClick={() =>
            onChange({ ...style, fontFamily: "Tiro Bangla", underline: !style.underline })
          }
          className={`h-7 w-7 rounded underline border ${
            style.underline ? "bg-amber-400 border-amber-500" : "bg-white border-stone-300"
          }`}
        >
          U
        </button>

        <div className="h-5 w-px bg-stone-200" />

        {/* Alignment Icons */}
        <button
          type="button"
          onClick={() => onChange({ ...style, fontFamily: "Tiro Bangla", align: "left" })}
          className={`flex h-7 w-7 items-center justify-center rounded border ${
            style.align === "left"
              ? "bg-amber-400 border-amber-500"
              : "bg-white border-stone-300"
          }`}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...style, fontFamily: "Tiro Bangla", align: "center" })}
          className={`flex h-7 w-7 items-center justify-center rounded border ${
            style.align === "center"
              ? "bg-amber-400 border-amber-500"
              : "bg-white border-stone-300"
          }`}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...style, fontFamily: "Tiro Bangla", align: "right" })}
          className={`flex h-7 w-7 items-center justify-center rounded border ${
            style.align === "right"
              ? "bg-amber-400 border-amber-500"
              : "bg-white border-stone-300"
          }`}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Text Color Swatches + Custom (+) */}
        <div className="flex items-center gap-1.5">
          <span className="text-stone-500">Color:</span>
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...style, fontFamily: "Tiro Bangla", textColor: c })}
              style={{ backgroundColor: c }}
              className={`h-5 w-5 rounded-full border ${
                style.textColor === c ? "ring-2 ring-amber-500 scale-110" : "border-stone-300"
              }`}
              aria-label={`Text color ${c}`}
            />
          ))}
          <button
            type="button"
            onClick={() => textColorInputRef.current?.click()}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-stone-400 bg-white text-stone-700 hover:border-amber-500"
            title="Custom text color"
          >
            <Plus className="h-3 w-3" />
          </button>
          <input
            ref={textColorInputRef}
            type="color"
            value={style.textColor}
            onChange={(e) =>
              onChange({ ...style, fontFamily: "Tiro Bangla", textColor: e.target.value })
            }
            className="sr-only"
          />
        </div>

        {/* Background Color Swatches (No text labels) + None + Custom (+) */}
        <div className="flex items-center gap-1.5">
          <span className="text-stone-500">BG:</span>
          <button
            type="button"
            onClick={() =>
              onChange({ ...style, fontFamily: "Tiro Bangla", backgroundColor: "transparent" })
            }
            className={`flex h-5 w-5 items-center justify-center rounded-full border bg-white text-stone-500 ${
              style.backgroundColor === "transparent"
                ? "ring-2 ring-amber-500 scale-110"
                : "border-stone-300"
            }`}
            title="No background"
          >
            <Ban className="h-3 w-3" />
          </button>
          {BG_COLORS.map((bg) => (
            <button
              key={bg}
              type="button"
              onClick={() => onChange({ ...style, fontFamily: "Tiro Bangla", backgroundColor: bg })}
              style={{ backgroundColor: bg }}
              className={`h-5 w-5 rounded-full border ${
                style.backgroundColor === bg
                  ? "ring-2 ring-amber-500 scale-110"
                  : "border-stone-300"
              }`}
              aria-label={`Background color ${bg}`}
            />
          ))}
          <button
            type="button"
            onClick={() => bgColorInputRef.current?.click()}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-stone-400 bg-white text-stone-700 hover:border-amber-500"
            title="Custom background color"
          >
            <Plus className="h-3 w-3" />
          </button>
          <input
            ref={bgColorInputRef}
            type="color"
            value={style.backgroundColor === "transparent" ? "#FEF08A" : style.backgroundColor}
            onChange={(e) =>
              onChange({ ...style, fontFamily: "Tiro Bangla", backgroundColor: e.target.value })
            }
            className="sr-only"
          />
        </div>

        {/* Save Default */}
        <button
          type="button"
          onClick={onSaveAsDefault}
          className="rounded-lg bg-stone-900 px-2.5 py-1 text-white hover:bg-stone-800"
        >
          {savedNotice ? "Default Saved!" : "Make default"}
        </button>
      </div>
    </div>
  );
}
