import { useEffect, useRef, useState } from "react";
import { useSignedLearningUrl } from "@/components/signed-image";
import { FileText } from "lucide-react";

// Lazy-loaded pdf.js worker setup
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then(async (pdfjs) => {
      const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

type Props = {
  src: string;
  className?: string;
  alt?: string;
};

/** Renders the first page of a PDF (stored in private bucket) as an image. */
export function PdfThumbnail({ src, className, alt }: Props) {
  const signedUrl = useSignedLearningUrl(src);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!signedUrl) return;
    (async () => {
      try {
        const pdfjs = await getPdfjs();
        const doc = await pdfjs.getDocument({ url: signedUrl }).promise;
        const page = await doc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const targetW = 600;
        const scale = targetW / viewport.width;
        const v = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        canvas.width = v.width;
        canvas.height = v.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport: v, canvas }).promise;
        if (!cancelled) setReady(true);
      } catch (e) {
        console.warn("PDF thumbnail failed", e);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedUrl]);

  if (failed) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#fff5f3] to-[#fef8e7] ${className ?? ""}`}>
        <FileText className="h-10 w-10 text-[#ff7a6c]" />
        <div className="text-[10px] mt-2 font-mono uppercase text-[#ff7a6c]">PDF</div>
      </div>
    );
  }

  return (
    <div className={`relative bg-white ${className ?? ""}`}>
      <canvas ref={canvasRef} className="w-full h-full object-cover block" aria-label={alt} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#fff5f3] to-[#fef8e7]">
          <FileText className="h-8 w-8 text-[#ff7a6c] animate-pulse" />
        </div>
      )}
    </div>
  );
}