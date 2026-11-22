'use client';

import { useState, useEffect } from 'react';

export default function AnnotationTools() {
  // ১. প্রথমে ডিফল্ট ভ্যালু সেট থাকবে (SSR এরর এড়াতে)
  const [penColor, setPenColor] = useState<string>('#2563EB'); // ডিফল্ট গাঢ় নীল
  const [penSize, setPenSize] = useState<number>(2.5);         // ডিফল্ট ২.৫px
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // ২. অ্যাপ ওপেন হওয়ার সাথে সাথে সর্বশেষ সেভ করা কালার ও সাইজ লোড করবে
  useEffect(() => {
    const savedColor = localStorage.getItem('sohoje_pen_color');
    const savedSize = localStorage.getItem('sohoje_pen_size');

    if (savedColor) setPenColor(savedColor);
    if (savedSize) setPenSize(Number(savedSize));
    
    setIsLoaded(true);
  }, []);

  // ৩. কালার বা সাইজ পরিবর্তন করলেই তা সাথে সাথে localStorage-এ সেভ করবে
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem('sohoje_pen_color', penColor);
    localStorage.setItem('sohoje_pen_size', String(penSize));
  }, [penColor, penSize, isLoaded]);

  return (
    <div className="flex items-center gap-3 p-2 bg-white border rounded-lg">
      {/* কালার বাটন উদাহরণ */}
      {['#2563EB', '#0F172A', '#EF4444', '#10B981'].map((color) => (
        <button
          key={color}
          onClick={() => setPenColor(color)}
          style={{ backgroundColor: color }}
          className={`w-6 h-6 rounded-full ${
            penColor === color ? 'ring-2 ring-offset-2 ring-slate-900' : ''
          }`}
        />
      ))}

      {/* সাইজ বাটন উদাহরণ */}
      {[1.5, 2.5, 4].map((size) => (
        <button
          key={size}
          onClick={() => setPenSize(size)}
          className={`px-2 py-1 text-xs rounded border ${
            penSize === size ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'
          }`}
        >
          {size}px
        </button>
      ))}
    </div>
  );
}
