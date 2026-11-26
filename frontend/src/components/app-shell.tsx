"use client";

import clsx from "clsx";
import {
  Briefcase,
  FileText,
  House,
  ListChecks,
  Menu,
  Mic,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BRAND } from "@/config/brand";
import { useProfile } from "@/lib/hooks";
import { clockTime } from "@/lib/format";

const NAV = [
  { href: "/home", label: "Home", icon: House },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/tracker", label: "Tracker", icon: ListChecks },
  { href: "/cv", label: "My CV", icon: FileText },
  { href: "/interviews", label: "Interviews", icon: Mic },
  { href: "/settings", label: "Search settings", icon: SlidersHorizontal },
  { href: "/account", label: "Account", icon: User },
];

const MOBILE_MAIN = ["/home", "/jobs", "/tracker", "/cv"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5 font-display text-[22px] font-bold tracking-tight", className)}>
      <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
        <rect x="2" y="9" width="3" height="11" fill="#f4c430" />
        <rect x="9" y="4" width="3" height="16" fill="#f4c430" />
        <rect x="16" y="9" width="3" height="11" fill="#f4c430" />
      </svg>
      {BRAND.name}
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const profile = useProfile();
  const [menuOpen, setMenuOpen] = useState(false);

  const schedule = profile.data
    ? profile.data.search_paused
      ? "Daily search is paused"
      : `Searches daily at ${clockTime(profile.data.run_time)}`
    : "";

  return (
    <div className="min-h-screen">
      <aside className="on-ink no-print fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col bg-ink px-4 py-6 text-white md:flex">
        <Link href="/home" className="px-2 pb-8">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-3 rounded-[9px] border-l-[3px] px-3 py-2.5 text-[15px] transition",
                  active
                    ? "border-tape bg-white/10 font-semibold text-white"
                    : "border-transparent text-white/70 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-[18px]" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        {schedule && (
          <Link href="/settings" className="mt-4 rounded-[9px] bg-white/5 px-3 py-3 text-sm text-white/75 hover:bg-white/10">
            {schedule}
          </Link>
        )}
      </aside>

      <header className="on-ink no-print sticky top-0 z-30 flex items-center justify-between bg-ink px-5 py-3 text-white md:hidden">
        <Link href="/home">
          <Wordmark className="text-xl" />
        </Link>
      </header>

      <main className="md:pl-[248px]">
        <div className="mx-auto max-w-[1040px] px-5 pb-28 pt-8 md:px-10 md:pb-16 md:pt-12">{children}</div>
      </main>

      <nav
        aria-label="Main"
        className="on-ink no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-ink text-white md:hidden"
      >
        {NAV.filter((item) => MOBILE_MAIN.includes(item.href)).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex flex-col items-center gap-1 py-2.5 text-[11px]",
                active ? "font-semibold text-tape" : "text-white/70",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-white/70"
        >
          <Menu className="size-5" aria-hidden />
          More
        </button>
      </nav>

      {menuOpen && (
        <div className="on-ink fixed inset-0 z-40 bg-ink/95 p-6 text-white md:hidden" role="dialog" aria-label="More">
          <button
            onClick={() => setMenuOpen(false)}
            className="mb-6 ml-auto flex items-center gap-2 text-sm text-white/80"
          >
            <X className="size-5" aria-hidden /> Close
          </button>
          <div className="flex flex-col gap-1">
            {NAV.filter((item) => !MOBILE_MAIN.includes(item.href)).map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 rounded-[10px] px-3 py-3.5 text-lg hover:bg-white/10"
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
          {schedule && <p className="mt-6 px-3 text-sm text-white/70">{schedule}</p>}
        </div>
      )}
    </div>
  );
}
