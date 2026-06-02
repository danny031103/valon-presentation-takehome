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

export type ExtractedMultiContext = {
  text: string;
  fileNames: string[];
  truncated: boolean;
};

async function extractText(file: File): Promise<string> {
  if (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  ) {
    return extractPdf(file);
  } else if (
    file.type === "text/plain" ||
    file.name.toLowerCase().endsWith(".txt")
  ) {
    return extractTxt(file);
  } else {
    throw new Error("Unsupported file type. Please upload a PDF or TXT file.");
  }
}

export function useDocumentExtract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extract = useCallback(
    async (file: File): Promise<ExtractedContext | null> => {
      setLoading(true);
      setError(null);

      try {
        let text = await extractText(file);

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

  const extractMultiple = useCallback(
    async (files: File[]): Promise<ExtractedMultiContext | null> => {
      setLoading(true);
      setError(null);

      try {
        let combined = "";
        const fileNames: string[] = [];
        let truncated = false;

        for (const file of files) {
          const text = await extractText(file);
          const segment = `--- ${file.name} ---\n${text}\n`;

          if (combined.length + segment.length > MAX_STORED_CHARS) {
            const remaining = MAX_STORED_CHARS - combined.length;
            if (remaining > 0) {
              combined += segment.slice(0, remaining);
            }
            truncated = true;
            fileNames.push(file.name);
            break;
          }

          combined += segment;
          fileNames.push(file.name);
        }

        return { text: combined, fileNames, truncated };
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

  return { extract, extractMultiple, loading, error };
}
