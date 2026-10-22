"use client";
import Link from "next/link";
import { ScanEye } from "lucide-react";
export function ReviewLink({
  id,
  compact = false,
}: {
  id: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/revision/${id}`}
      title="Presentar y revisar versiones"
      aria-label="Presentar y revisar versiones"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100"
    >
      <ScanEye size={16} />
      {!compact && "Presentar y revisar"}
    </Link>
  );
}
