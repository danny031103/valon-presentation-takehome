import { useCallback, useState } from "react";

const MAX_STORED_CHARS = 30 * 1024; // 30 KB — leave headroom for imageData in localStorage

async function extractPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item) => "str" in item)
      .map((item) => (item as { str: string }).str)
      .join(" ");
    pages.push(pageText);
  }

  return pages.join("\n");
}

async function extractTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsText(file);
  });
}

export type ExtractedContext = {
  text: string;
  fileName: string;
  truncated: boolean;
};

export function useDocumentExtract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extract = useCallback(
    async (file: File): Promise<ExtractedContext | null> => {
      setLoading(true);
      setError(null);

      try {
        let text: string;

        if (
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
        ) {
          text = await extractPdf(file);
        } else if (
          file.type === "text/plain" ||
          file.name.toLowerCase().endsWith(".txt")
        ) {
          text = await extractTxt(file);
        } else {
          throw new Error(
            "Unsupported file type. Please upload a PDF or TXT file."
          );
        }

        const truncated = text.length > MAX_STORED_CHARS;
        if (truncated) {
          text = text.slice(0, MAX_STORED_CHARS);
        }

        return { text, fileName: file.name, truncated };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to extract text.";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { extract, loading, error };
}
