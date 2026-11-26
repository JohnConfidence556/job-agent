"use client";

import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import clsx from "clsx";
import { ErrorNote } from "@/components/ui";
import { useToast } from "@/components/providers";
import { useUploadCv } from "@/lib/hooks";

const MAX_BYTES = 5 * 1024 * 1024;

export function CvUpload({ onDone, compact = false }: { onDone?: () => void; compact?: boolean }) {
  const upload = useUploadCv();
  const { toast } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function send(file: File | undefined) {
    setProblem(null);
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setProblem("Upload a PDF or Word (.docx) file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setProblem("That file is larger than 5 MB.");
      return;
    }
    upload.mutate(file, {
      onSuccess: () => {
        toast("CV saved");
        onDone?.();
      },
      onError: (error) => setProblem(error.message),
    });
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          send(event.dataTransfer.files[0]);
        }}
        className={clsx(
          "rounded-[var(--radius-panel)] border-2 border-dashed px-6 text-center transition",
          compact ? "py-6" : "py-12",
          dragging ? "border-ink bg-tape/20" : "border-ink/30 bg-sheet",
        )}
      >
        {upload.isPending ? (
          <div className="mx-auto max-w-xs">
            <p className="font-display text-lg font-semibold">Reading your CV</p>
            <div className="stitching mt-4" aria-hidden />
            <p className="mt-3 text-sm text-mute">This takes up to 30 seconds. Keep this page open.</p>
          </div>
        ) : (
          <>
            <FileUp className="mx-auto mb-3 size-7 text-ink-2" aria-hidden />
            <p className="font-display text-lg font-semibold">Drop your CV here</p>
            <p className="mt-1 text-sm text-mute">PDF or Word, up to 5 MB</p>
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="mt-4 inline-flex min-h-10 items-center rounded-[9px] border border-ink/80 bg-sheet px-4 text-sm font-medium hover:bg-paper"
            >
              Choose a file
            </button>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          aria-label="CV file"
          onChange={(event) => {
            send(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
      {problem && (
        <div className="mt-3">
          <ErrorNote message={problem} />
        </div>
      )}
    </div>
  );
}
