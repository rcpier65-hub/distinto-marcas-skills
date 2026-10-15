"use client";
import {
  useEffect,
  useRef,
  useId,
  isValidElement,
  cloneElement,
  type ReactElement,
} from "react";
import { X, ArrowUpRight } from "lucide-react";
import Link from "next/link";
export async function api(url: string, input?: unknown) {
  const res = await fetch(url, {
    ...(input
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      : {}),
    cache: "no-store",
  });
  const out = await res.json();
  if (!res.ok)
    throw new Error(out.error || "No se pudo completar la operación");
  return out;
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog className="st-modal" ref={ref} onCancel={close}>
      <div className="st-row">
        <h2>{title}</h2>
        <button className="st-icon" onClick={close} aria-label="Cerrar">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  const id = useId();
  const control =
    isValidElement(children) &&
    typeof children.type === "string" &&
    ["input", "textarea", "select"].includes(children.type);
  return (
    <div className="st-field">
      <label htmlFor={control ? id : undefined}>{label}</label>
      {control
        ? cloneElement(children as ReactElement<{ id?: string }>, { id })
        : children}
      {hint && <small>{hint}</small>}
    </div>
  );
}
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="st-empty">{children}</div>;
}
export function Jump({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link className="st-link" href={href}>
      {children}
      <ArrowUpRight size={14} />
    </Link>
  );
}
export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
}) {
  return (
    <div className="st-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function PrettyDate({ value }: { value: string | null | undefined }) {
  return (
    <>
      {value
        ? new Date(
            String(value).includes("T")
              ? value
              : String(value).slice(0, 10) + "T12:00:00",
          ).toLocaleDateString("es-PE", { day: "numeric", month: "short" })
        : "Sin fecha"}
    </>
  );
}
