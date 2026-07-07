'use client';

/* ============================================================================
   DateTimeFields — TimeField + DateField
   Pickers modernos custom que reemplazan los <input type="date"/"time"> nativos
   (Pedro: los nativos "horribles"). Diseñados con un panel de diseño (variante C
   base + chips rápidos de B + preview en vivo de A).
   React 19 + Tailwind v4 + lucide-react. Self-contained, drop-in.
   - Sin bugs de zona horaria: las fechas se arman de enteros Y/M/D, nunca
     new Date(isoString).
   - El popover se renderiza en un PORTAL a document.body para que no lo clipée
     la card (overflow-hidden) ni lo descoloque el transform de hover.
   ========================================================================== */

import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { Clock, Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';

/* ───────────────────────── shared helpers ───────────────────────── */

const ACCENT = '#ba41f7';
const ACCENT_HOVER = '#a936e0';

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(' ');

/** Closes on outside-click and on Escape. */
function useDismiss(
  open: boolean,
  close: () => void,
  refs: React.RefObject<HTMLElement | null>[],
) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (refs.some((r) => r.current && r.current.contains(t))) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, close, refs]);
}

/**
 * Anchors a fixed-position popover to the trigger, flipping above when there's
 * no room below and clamping horizontally inside the viewport. Combined with a
 * portal to document.body, this keeps the popover from being clipped by the
 * card (overflow-hidden) or mis-anchored by the card's hover transform.
 */
function usePopoverPosition(
  open: boolean,
  triggerRef: React.RefObject<HTMLElement | null>,
  panelRef: React.RefObject<HTMLElement | null>,
) {
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    opacity: 0,
    pointerEvents: 'none',
  });

  const place = useCallback(() => {
    const t = triggerRef.current;
    const p = panelRef.current;
    if (!t || !p) return;
    const tr = t.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 8;
    const margin = 8;

    const below = vh - tr.bottom;
    const flip = below < pr.height + gap && tr.top > below;
    const top = flip ? tr.top - pr.height - gap : tr.bottom + gap;

    let left = tr.left;
    if (left + pr.width > vw - margin) left = vw - margin - pr.width;
    if (left < margin) left = margin;

    setStyle({
      position: 'fixed',
      top: Math.round(top),
      left: Math.round(left),
      opacity: 1,
      pointerEvents: 'auto',
      transformOrigin: flip ? 'bottom left' : 'top left',
      zIndex: 1000,
    });
  }, [triggerRef, panelRef]);

  useLayoutEffect(() => {
    if (!open) {
      setStyle((s) => ({ ...s, opacity: 0, pointerEvents: 'none' }));
      return;
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place]);

  return style;
}

const triggerBase =
  'group inline-flex h-11 w-full items-center gap-2.5 rounded-xl bg-white px-3.5 text-left ' +
  'ring-1 ring-black/[0.06] shadow-sm transition-all ' +
  'hover:ring-black/[0.12] hover:shadow ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ba41f7]/50';

const panelBase =
  'rounded-2xl bg-white/95 p-3 shadow-xl ring-1 ring-black/[0.08] backdrop-blur-xl';

/* ═══════════════════════════════════════════════════════════════════
   TIME FIELD — segmented inline control + quick chips
   ═══════════════════════════════════════════════════════════════════ */

type TimeFieldProps = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  minuteStep?: number;
  className?: string;
};

const TIME_PRESETS = ['09:00', '10:00', '14:00', '16:00', '18:00'];

/** "HH:MM" 24h → { h12, m, mer } | null */
function parse24(value: string) {
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!m) return null;
  const h = +m[1];
  const min = +m[2];
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  const mer: 'am' | 'pm' = h >= 12 ? 'pm' : 'am';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return { h12, m: min, mer };
}

/** parts → "HH:MM" 24h */
function to24(h12: number, m: number, mer: 'am' | 'pm') {
  let h = h12 % 12;
  if (mer === 'pm') h += 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Spanish 12h label: "10:00 a. m." / "2:30 p. m." */
function formatTime(value: string) {
  const p = parse24(value);
  if (!p) return null;
  const suffix = p.mer === 'am' ? 'a. m.' : 'p. m.';
  return `${p.h12}:${String(p.m).padStart(2, '0')} ${suffix}`;
}

/** Scrollable listbox column that snaps the active item into view (without scrolling the page). */
function ScrollColumn({
  items,
  selected,
  onSelect,
  label,
  format,
}: {
  items: number[];
  selected: number | null;
  onSelect: (v: number) => void;
  label: string;
  format: (n: number) => string;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  // Center the active row by manipulating the list's own scrollTop only —
  // never el.scrollIntoView(), which can scroll the whole document/popover.
  useEffect(() => {
    const list = listRef.current;
    const el = activeRef.current;
    if (!list || !el) return;
    const target = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
    list.scrollTop = Math.max(0, target);
  }, [selected]);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        {label}
      </div>
      <ul
        ref={listRef}
        role="listbox"
        aria-label={label}
        tabIndex={-1}
        className="h-[176px] space-y-0.5 overflow-y-auto overscroll-contain px-0.5 pr-1 [scrollbar-width:thin]"
      >
        {items.map((n) => {
          const active = n === selected;
          return (
            <li
              key={n}
              ref={active ? activeRef : undefined}
              role="option"
              aria-selected={active}
            >
              <button
                type="button"
                onClick={() => onSelect(n)}
                className={cx(
                  'flex w-full items-center justify-center rounded-lg py-2 text-[15px] font-medium tabular-nums transition-colors',
                  'min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ba41f7]/40',
                  active
                    ? 'text-white shadow-sm'
                    : 'text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200',
                )}
                style={active ? { backgroundColor: ACCENT } : undefined}
              >
                {format(n)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TimeField({
  value,
  onChange,
  disabled = false,
  minuteStep = 5,
  className,
}: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useDismiss(open, close, [triggerRef, panelRef]);
  const posStyle = usePopoverPosition(open, triggerRef, panelRef);

  const parsed = parse24(value);

  // Draft state so the user can build a time before all parts are chosen.
  const [draft, setDraft] = useState<{
    h12: number | null;
    m: number | null;
    mer: 'am' | 'pm';
  }>(() =>
    parsed
      ? { h12: parsed.h12, m: parsed.m, mer: parsed.mer }
      : { h12: null, m: null, mer: 'am' },
  );

  // Resync the draft to the incoming value each time we open.
  useEffect(() => {
    if (!open) return;
    const p = parse24(value);
    setDraft(
      p ? { h12: p.h12, m: p.m, mer: p.mer } : { h12: null, m: null, mer: 'am' },
    );
  }, [open, value]);

  const minutes = useMemo(() => {
    const step = Math.max(1, Math.min(60, Math.round(minuteStep)));
    const out: number[] = [];
    for (let m = 0; m < 60; m += step) out.push(m);
    return out;
  }, [minuteStep]);

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const commit = useCallback(
    (next: { h12: number | null; m: number | null; mer: 'am' | 'pm' }) => {
      setDraft(next);
      if (next.h12 != null && next.m != null) {
        onChange(to24(next.h12, next.m, next.mer));
      }
    },
    [onChange],
  );

  // One-tap quick presets (grafted from variant B) — the fastest common path.
  const applyPreset = (preset: string) => {
    const p = parse24(preset);
    if (!p) return;
    setDraft({ h12: p.h12, m: p.m, mer: p.mer });
    onChange(preset);
    close();
    triggerRef.current?.focus();
  };

  const label = formatTime(value);
  const draftReady = draft.h12 != null && draft.m != null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cx(
          triggerBase,
          open && 'ring-2 ring-[#ba41f7]/50',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <span
          className={cx(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
            label ? 'text-white' : 'bg-neutral-100 text-neutral-400',
          )}
          style={label ? { backgroundColor: ACCENT } : undefined}
        >
          <Clock className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <span
          className={cx(
            'min-w-0 flex-1 truncate text-[15px] font-medium tabular-nums',
            label ? 'text-neutral-900' : 'text-neutral-400',
          )}
        >
          {label ?? 'Elegir hora'}
        </span>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Elegir hora"
            style={posStyle}
            className={cx(panelBase, 'w-[300px] origin-top animate-[tfPop_.13s_ease-out]')}
          >
            {/* live preview */}
            <div className="mb-2.5 flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 ring-1 ring-black/[0.04]">
              <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                Hora
              </span>
              <span
                className="text-[15px] font-semibold tabular-nums"
                style={{ color: draftReady ? ACCENT : '#a3a3a3' }}
              >
                {draftReady
                  ? `${draft.h12}:${String(draft.m).padStart(2, '0')} ${draft.mer === 'am' ? 'a. m.' : 'p. m.'}`
                  : '--:-- --'}
              </span>
            </div>

            {/* segmented bar: hours · minutes · am/pm */}
            <div className="flex gap-2">
              <div className="flex flex-1 gap-2 rounded-xl bg-neutral-50/80 p-1 ring-1 ring-black/[0.04]">
                <ScrollColumn
                  label="Hora"
                  items={hours}
                  selected={draft.h12}
                  onSelect={(h) => commit({ ...draft, h12: h })}
                  format={(n) => String(n)}
                />
                <div className="w-px self-stretch bg-black/[0.06]" />
                <ScrollColumn
                  label="Min"
                  items={minutes}
                  selected={draft.m}
                  onSelect={(m) => commit({ ...draft, m })}
                  format={(n) => String(n).padStart(2, '0')}
                />
              </div>

              {/* AM/PM vertical pill toggle */}
              <div className="flex w-[58px] flex-col gap-1 rounded-xl bg-neutral-50/80 p-1 ring-1 ring-black/[0.04]">
                {(['am', 'pm'] as const).map((mer) => {
                  const active = draft.mer === mer;
                  return (
                    <button
                      key={mer}
                      type="button"
                      onClick={() => commit({ ...draft, mer })}
                      aria-pressed={active}
                      className={cx(
                        'flex flex-1 items-center justify-center rounded-lg text-[13px] font-semibold uppercase transition-all',
                        'min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ba41f7]/40',
                        active
                          ? 'text-white shadow-sm'
                          : 'text-neutral-500 hover:bg-white hover:text-neutral-800',
                      )}
                      style={active ? { backgroundColor: ACCENT } : undefined}
                    >
                      {mer === 'am' ? 'a.m.' : 'p.m.'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* quick chips — one-tap common times */}
            <div className="mt-3">
              <div className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Horas rápidas
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TIME_PRESETS.map((preset) => {
                  const active = value === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={cx(
                        'min-h-[36px] rounded-lg px-3 text-[13px] font-medium tabular-nums transition',
                        active
                          ? 'text-white shadow-sm'
                          : 'bg-white text-neutral-700 ring-1 ring-black/[0.06] hover:text-[#a936e0] hover:ring-[#ba41f7]/40',
                      )}
                      style={active ? { backgroundColor: ACCENT } : undefined}
                    >
                      {formatTime(preset)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* footer actions */}
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setDraft({ h12: null, m: null, mer: 'am' });
                  close();
                }}
                className="flex-1 rounded-lg px-3 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100"
              >
                Borrar
              </button>
              <button
                type="button"
                disabled={!draftReady}
                onClick={close}
                className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: ACCENT }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled)
                    e.currentTarget.style.backgroundColor = ACCENT_HOVER;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = ACCENT;
                }}
              >
                <Check className="h-4 w-4" strokeWidth={2.5} /> Listo
              </button>
            </div>
          </div>,
          document.body,
        )}

      <style>{`@keyframes tfPop{from{opacity:0;transform:scale(.97) translateY(-2px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DATE FIELD — refined month calendar, sliding transitions, Hoy/Mañana chips
   ═══════════════════════════════════════════════════════════════════ */

type DateFieldProps = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
};

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']; // Monday-first
const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const MONTHS_ABBR = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];
const WEEKDAYS_ABBR = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']; // Mon=0

/** Parse "YYYY-MM-DD" into {y,m,d} with NO Date()/timezone involvement. */
function parseISO(value: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

const toISO = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Mon=0 … Sun=6 weekday index for the 1st of a month (day-only Date math, safe). */
function firstWeekdayMon(y: number, m: number) {
  const js = new Date(y, m - 1, 1).getDay();
  return (js + 6) % 7;
}
const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate();

/** Weekday index Mon=0 for a Y/M/D (day-only Date math, no ISO parsing). */
function weekdayMon(y: number, m: number, d: number) {
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

/** Spanish trigger label: "vie 20 jun 2026" (all lowercase). */
function formatDateLabel(value: string) {
  const p = parseISO(value);
  if (!p) return null;
  return `${WEEKDAYS_ABBR[weekdayMon(p.y, p.m, p.d)]} ${p.d} ${MONTHS_ABBR[p.m - 1]} ${p.y}`;
}

/** Add `n` days to a Y/M/D using day-only Date math, returning Y/M/D. */
function addDays(y: number, m: number, d: number, n: number) {
  const dt = new Date(y, m - 1, d + n);
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

export function DateField({
  value,
  onChange,
  disabled = false,
  className,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useDismiss(open, close, [triggerRef, panelRef]);
  const posStyle = usePopoverPosition(open, triggerRef, panelRef);

  const selected = parseISO(value);
  const today = useMemo(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate() };
  }, []);

  // Which month the calendar is showing.
  const [view, setView] = useState(() => ({
    y: selected?.y ?? today.y,
    m: selected?.m ?? today.m,
  }));
  // Slide direction for the transition: 1 = forward, -1 = back, 0 = none.
  const [dir, setDir] = useState(0);

  useEffect(() => {
    if (open) {
      const s = parseISO(value);
      setDir(0);
      setView({ y: s?.y ?? today.y, m: s?.m ?? today.m });
    }
  }, [open, value, today.y, today.m]);

  const step = useCallback((delta: number) => {
    setDir(delta);
    setView((v) => {
      let m = v.m + delta;
      let y = v.y;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      return { y, m };
    });
  }, []);

  // Build the 6×7 grid for the current view month.
  const cells = useMemo(() => {
    const lead = firstWeekdayMon(view.y, view.m);
    const total = daysInMonth(view.y, view.m);
    const out: { d: number | null }[] = [];
    for (let i = 0; i < lead; i++) out.push({ d: null });
    for (let d = 1; d <= total; d++) out.push({ d });
    while (out.length % 7 !== 0) out.push({ d: null });
    return out;
  }, [view.y, view.m]);

  const pick = (y: number, m: number, d: number) => {
    onChange(toISO(y, m, d));
    close();
    triggerRef.current?.focus();
  };

  // Quick chips (grafted from variant B).
  const tomorrow = addDays(today.y, today.m, today.d, 1);
  const todayISO = toISO(today.y, today.m, today.d);
  const tomorrowISO = toISO(tomorrow.y, tomorrow.m, tomorrow.d);
  const chips = [
    { label: 'Hoy', iso: todayISO, ymd: today },
    { label: 'Mañana', iso: tomorrowISO, ymd: tomorrow },
  ];

  const label = formatDateLabel(value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cx(
          triggerBase,
          open && 'ring-2 ring-[#ba41f7]/50',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <span
          className={cx(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
            label ? 'text-white' : 'bg-neutral-100 text-neutral-400',
          )}
          style={label ? { backgroundColor: ACCENT } : undefined}
        >
          <Calendar className="h-4 w-4" strokeWidth={2.25} />
        </span>
        <span
          className={cx(
            'min-w-0 flex-1 truncate text-[15px] font-medium',
            label ? 'text-neutral-900' : 'text-neutral-400',
          )}
        >
          {label ?? 'Elegir fecha'}
        </span>
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Elegir fecha"
            style={posStyle}
            className={cx(panelBase, 'w-[296px] animate-[dfPop_.13s_ease-out]')}
          >
            {/* quick chips */}
            <div className="mb-2.5 flex gap-1.5">
              {chips.map((chip) => {
                const active = value === chip.iso;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setView({ y: chip.ymd.y, m: chip.ymd.m });
                      pick(chip.ymd.y, chip.ymd.m, chip.ymd.d);
                    }}
                    className={cx(
                      'min-h-[36px] flex-1 rounded-lg px-3 text-[13px] font-semibold transition',
                      active
                        ? 'text-white shadow-sm'
                        : 'bg-neutral-50 text-neutral-700 ring-1 ring-black/[0.06] hover:text-[#a936e0] hover:ring-[#ba41f7]/40',
                    )}
                    style={active ? { backgroundColor: ACCENT } : undefined}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* month nav */}
            <div className="mb-2 flex items-center justify-between px-0.5">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Mes anterior"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ba41f7]/40"
              >
                <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.25} />
              </button>
              <div className="overflow-hidden text-center">
                <div
                  key={`${view.y}-${view.m}`}
                  className="text-[14px] font-semibold capitalize text-neutral-900"
                  style={{
                    animation:
                      dir !== 0
                        ? `dfSlide${dir > 0 ? 'L' : 'R'} .22s cubic-bezier(.22,1,.36,1)`
                        : undefined,
                  }}
                >
                  {MONTHS_LONG[view.m - 1]} {view.y}
                </div>
              </div>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Mes siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ba41f7]/40"
              >
                <ChevronRight className="h-[18px] w-[18px]" strokeWidth={2.25} />
              </button>
            </div>

            {/* weekday headers */}
            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((w, i) => (
                <div
                  key={i}
                  className="flex h-7 items-center justify-center text-[11px] font-semibold uppercase text-neutral-400"
                >
                  {w}
                </div>
              ))}
            </div>

            {/* day grid (slides on month change) */}
            <div className="overflow-hidden">
              <div
                key={`${view.y}-${view.m}-grid`}
                className="grid grid-cols-7 gap-0.5"
                style={{
                  animation:
                    dir !== 0
                      ? `dfSlide${dir > 0 ? 'L' : 'R'} .22s cubic-bezier(.22,1,.36,1)`
                      : undefined,
                }}
              >
                {cells.map((c, i) => {
                  if (c.d == null) return <div key={i} className="h-9" />;
                  const isSel =
                    !!selected &&
                    selected.y === view.y &&
                    selected.m === view.m &&
                    selected.d === c.d;
                  const isToday =
                    today.y === view.y && today.m === view.m && today.d === c.d;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => pick(view.y, view.m, c.d!)}
                      aria-label={`${c.d} de ${MONTHS_LONG[view.m - 1]} de ${view.y}`}
                      aria-pressed={isSel}
                      className={cx(
                        'relative flex h-9 items-center justify-center rounded-lg text-[13.5px] font-medium tabular-nums transition-all',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ba41f7]/40',
                        isSel
                          ? 'text-white shadow-sm'
                          : isToday
                            ? 'text-[#ba41f7] hover:bg-[#ba41f7]/10'
                            : 'text-neutral-700 hover:bg-neutral-100 active:bg-neutral-200',
                      )}
                      style={
                        isSel
                          ? { backgroundColor: ACCENT, boxShadow: '0 4px 12px rgba(186,65,247,0.35)' }
                          : undefined
                      }
                    >
                      {c.d}
                      {isToday && !isSel && (
                        <span
                          className="absolute bottom-1 h-1 w-1 rounded-full"
                          style={{ backgroundColor: ACCENT }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* footer: jump to today + clear */}
            <div className="mt-2 flex items-center gap-2 border-t border-black/[0.06] pt-2.5">
              <button
                type="button"
                onClick={() => {
                  setView({ y: today.y, m: today.m });
                  pick(today.y, today.m, today.d);
                }}
                className="flex-1 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors hover:bg-[#ba41f7]/10"
                style={{ color: ACCENT }}
              >
                Hoy
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    close();
                  }}
                  className="flex-1 rounded-lg px-3 py-1.5 text-[13px] font-medium text-neutral-500 transition-colors hover:bg-neutral-100"
                >
                  Borrar
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}

      <style>{`
        @keyframes dfPop{from{opacity:0;transform:scale(.97) translateY(-2px)}to{opacity:1;transform:scale(1) translateY(0)}}
        @keyframes dfSlideL{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:translateX(0)}}
        @keyframes dfSlideR{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}
      `}</style>
    </>
  );
}
