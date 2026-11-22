'use client';

import { createClient } from '@/utils/supabase/client';

const BUCKET_NAME = 'pdfs'; // Supabase Storage বাকেটের নাম
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB (বড় ফাইল সাপোর্ট)

export interface UploadPdfResult {
  filePath: string;
  publicUrl: string;
  fileSizeMb: number;
}

export async function uploadPdfToStorage(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadPdfResult> {
  if (!file) {
    throw new Error('কোনো ফাইল নির্বাচন করা হয়নি।');
  }

  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    throw new Error('শুধুমাত্র PDF ফাইল আপলোড করা যাবে।');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('ফাইলের সাইজ 200 MB-এর বেশি হতে পারবে না।');
  }

  onProgress?.(15);

  const supabase = createClient();
  const safeName = file.name
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 60);
  const filePath = `uploads/${Date.now()}-${safeName || 'document'}.pdf`;

  onProgress?.(35);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    // Supabase বাকেটে 50 MB লিমিট থাকলে স্পষ্ট বাংলা এরর মেসেজ দেখানো
    if (
      error.message.toLowerCase().includes('maximum allowed size') ||
      error.message.toLowerCase().includes('exceeded') ||
      error.message.toLowerCase().includes('payload too large')
    ) {
      throw new Error(
        `ফাইলটি বড় (${(file.size / (1024 * 1024)).toFixed(1)} MB)। Supabase Dashboard → Storage → ${BUCKET_NAME} বাকেটের Max file size লিমিট 50 MB-এর বেশি করে দিন।`
      );
    }
    throw new Error(`আপলোড ব্যর্থ হয়েছে: ${error.message}`);
  }

  onProgress?.(90);

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  onProgress?.(100);

  return {
    filePath,
    publicUrl: urlData.publicUrl,
    fileSizeMb: Number((file.size / (1024 * 1024)).toFixed(2)),
  };
}
