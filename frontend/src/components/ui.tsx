"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { STATUS_LABELS } from "@/lib/format";
import type { MatchStatus } from "@/lib/types";

type Variant = "primary" | "secondary" | "quiet" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-tape text-ink hover:bg-[#ffd244] font-semibold shadow-[0_2px_0_0_var(--color-ink)] active:translate-y-px active:shadow-none",
  secondary: "bg-sheet text-ink border border-ink/80 hover:bg-paper font-medium",
  quiet: "text-ink-2 hover:bg-ink/5 font-medium",
  danger: "text-chalk hover:bg-chalk/10 font-medium",
};

export function buttonClass(variant: Variant = "primary", extra?: string) {
  return clsx(
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-[9px] px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    extra,
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({ variant = "primary", loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, className)} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "secondary",
  className,
  children,
  external,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass(variant, className)}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-sm text-mute">{hint}</span>}
    </label>
  );
}

const fieldClass =
  "w-full rounded-[8px] border border-line bg-sheet px-3 py-2.5 text-[15px] text-ink placeholder:text-mute/70 hover:border-ink-2/50 focus:border-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-adire/40";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx(fieldClass, props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(fieldClass, "pr-8", props.className)} />;
}

const statusStyles: Record<MatchStatus, string> = {
  new: "bg-tape text-ink",
  reviewed: "bg-ink/10 text-ink",
  applied: "bg-stitch text-white",
  interviewing: "bg-adire text-white",
  closed: "bg-line text-ink-2",
  dismissed: "bg-line text-mute line-through",
};

export function StatusChip({ status }: { status: MatchStatus }) {
  return (
    <span className={clsx("inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold", statusStyles[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-mute" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label ?? "Loading"}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-dashed border-ink/25 px-6 py-10">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {children && <p className="mt-2 max-w-prose text-ink-2">{children}</p>}
      {action && <div className="mt-5 flex flex-wrap gap-3">{action}</div>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-[10px] border border-chalk/40 bg-chalk/5 px-4 py-3 text-sm text-chalk">
      {message}
      {onRetry && (
        <button onClick={onRetry} className="ml-3 font-semibold underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  children,
  actions,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[34px] font-bold md:text-[40px]">{title}</h1>
        {children && <p className="mt-2 max-w-prose text-ink-2">{children}</p>}
      </div>
      {actions}
    </header>
  );
}
