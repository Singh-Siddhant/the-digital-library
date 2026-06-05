import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfJsModule = typeof import("pdfjs-dist");

let pdfJsModulePromise: Promise<PdfJsModule> | null = null;

const getPdfJsModule = async (): Promise<PdfJsModule> => {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import("pdfjs-dist").then((pdfjs) => {
      // Configure CDN worker to avoid local bundler compilation issues in Next.js
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      return pdfjs;
    });
  }

  return pdfJsModulePromise;
};

export const loadPdfDocument = async (bytes: Uint8Array): Promise<PDFDocumentProxy> => {
  const pdfjs = await getPdfJsModule();
  return pdfjs.getDocument({ data: bytes }).promise;
};
