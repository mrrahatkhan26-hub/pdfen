export type ToolMode = "select" | "pen" | "highlighter" | "eraser" | "text";
export type BanglaFontFamily = "Tiro Bangla";

export interface TextStyleConfig {
  fontSize: number;
  textColor: string;
  backgroundColor: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: "left" | "center" | "right";
  fontFamily: BanglaFontFamily;
}

export interface StrokeAnnotation {
  id: string;
  type: "pen" | "highlighter";
  page: number;
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export interface TextAnnotation {
  id: string;
  type: "text";
  page: number;
  x: number;
  y: number;
  maxWidth: number;
  content: string;
  style: TextStyleConfig;
}

export type AnnotationItem = StrokeAnnotation | TextAnnotation;

export interface PdfDocumentRecord {
  id: string;
  title: string;
  storage_path: string;
  file_size_bytes: number;
  page_count: number;
  last_page: number;
  annotations: AnnotationItem[];
  last_opened_at: string;
}
