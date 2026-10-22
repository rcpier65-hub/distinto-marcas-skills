"use client";
import Link from "next/link";
import { Paintbrush } from "lucide-react";

export function DisenoBocetoButton({ href }: { href?: string | null }) {
  if (!href) return null;
  return <Link href={href} aria-label="Boceto" draggable={false}
    onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
    className="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-600 transition-colors hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-500">
    <Paintbrush size={17} aria-hidden="true" className="motion-safe:transition-transform motion-safe:group-hover:-rotate-12" />
    <span aria-hidden="true" className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">Boceto</span>
  </Link>;
}
