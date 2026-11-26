"use client";

import { X } from "lucide-react";
import { useState } from "react";

export function TagInput({
  value,
  onChange,
  placeholder,
  max = 10,
  label,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
  label: string;
}) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const text = raw.trim().replace(/,$/, "").trim();
    if (!text || value.length >= max) return;
    if (value.some((item) => item.toLowerCase() === text.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, text]);
    setDraft("");
  }

  return (
    <div className="rounded-[8px] border border-line bg-sheet p-2 focus-within:border-ink focus-within:ring-2 focus-within:ring-adire/40">
      <div className="flex flex-wrap gap-2">
        {value.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-sm text-white">
            {item}
            <button
              type="button"
              aria-label={`Remove ${item}`}
              onClick={() => onChange(value.filter((other) => other !== item))}
              className="rounded-full p-0.5 hover:bg-white/20"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}
        <input
          aria-label={label}
          value={draft}
          placeholder={value.length ? "" : placeholder}
          onChange={(event) => {
            const next = event.target.value;
            if (next.endsWith(",")) add(next);
            else setDraft(next);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            } else if (event.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          className="min-w-[160px] flex-1 bg-transparent px-1 py-1 text-[15px] placeholder:text-mute/70 focus:outline-none"
        />
      </div>
    </div>
  );
}
