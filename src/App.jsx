import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Moon, Milk, Droplets, NotebookPen, Plus, X, Settings2, ChevronLeft, ChevronRight,
  Pencil, Trash2, Sun, ListChecks, TrendingUp, Check, Clock3, Sparkles, AlertTriangle
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot
} from "recharts";

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */
const C = {
  bg: "#FBF6EF",
  surface: "#FFFFFF",
  surfaceAlt: "#F3ECE1",
  ink: "#34281F",
  inkMuted: "#8A7A6D",
  inkFaint: "#B9AC9E",
  border: "#E9E0D3",
  primary: "#3F6F67",
  primaryDark: "#2E5951",
  primaryLight: "#E4EFEC",
  feed: "#D08C2A",
  feedLight: "#FBEEDB",
  sleep: "#7A6DA8",
  sleepLight: "#EDEAF6",
  diaper: "#B5744C",
  diaperLight: "#F5E9DF",
  journal: "#5E8FA6",
  journalLight: "#E7F1F5",
  danger: "#B04A3D",
  dangerLight: "#F7E7E3",
};

const FONTS = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap');
    .bd-display { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
    .bd-body { font-family: 'Inter', sans-serif; }
    .bd-mono { font-family: 'Space Grotesk', sans-serif; font-variant-numeric: tabular-nums; }
    .bd-scroll::-webkit-scrollbar { display: none; }
    .bd-scroll { -ms-overflow-style: none; scrollbar-width: none; }
    @keyframes bd-pulse { 0%,100% { opacity: 1; } 50% { opacity: .45; } }
    .bd-pulse { animation: bd-pulse 1.8s ease-in-out infinite; }
    @keyframes bd-rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .bd-rise { animation: bd-rise .25s ease-out both; }
    @media (prefers-reduced-motion: reduce) {
      .bd-pulse, .bd-rise { animation: none !important; }
    }
  `}</style>
);

/* ------------------------------------------------------------------ */
/* Storage helpers                                                     */
/* ------------------------------------------------------------------ */
async function loadKey(key, fallback) {
  try {
    const res = await window.storage.get(key, false);
    if (!res || res.value === undefined || res.value === null) return fallback;
    return JSON.parse(res.value);
  } catch (e) {
    return fallback;
  }
}
async function saveKey(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
  } catch (e) {
    console.error("storage save failed", key, e);
  }
}

/* ------------------------------------------------------------------ */
/* Date / format helpers                                               */
/* ------------------------------------------------------------------ */
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function dayBounds(d) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { start, end };
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function clockStr(date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function dateStr(date, opts) {
  return date.toLocaleDateString(undefined, opts || { weekday: "short", month: "short", day: "numeric" });
}
function timeAgo(date, now) {
  const s = Math.max(0, Math.floor((now - date) / 1000));
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return `${h}h${rem ? " " + rem + "m" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
function durationStr(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}
function ageString(birth, now) {
  if (!birth) return "";
  const totalDays = Math.floor((now - birth) / 86400000);
  if (totalDays < 0) return "not born yet";
  if (totalDays < 7) return `${totalDays} day${totalDays === 1 ? "" : "s"} old`;
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months--;
  if (months < 1) {
    const weeks = Math.floor(totalDays / 7);
    const rem = totalDays % 7;
    return `${weeks} week${weeks === 1 ? "" : "s"}${rem ? `, ${rem} day${rem === 1 ? "" : "s"}` : ""} old`;
  }
  if (months < 24) {
    const anchor = new Date(birth);
    anchor.setMonth(anchor.getMonth() + months);
    const remDays = Math.floor((now - anchor) / 86400000);
    const weeks = Math.floor(remDays / 7);
    return `${months} month${months === 1 ? "" : "s"}${weeks ? `, ${weeks} week${weeks === 1 ? "" : "s"}` : ""} old`;
  }
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  return `${years} year${years === 1 ? "" : "s"}${remMonths ? `, ${remMonths} month${remMonths === 1 ? "" : "s"}` : ""} old`;
}

/* ------------------------------------------------------------------ */
/* Small primitives                                                    */
/* ------------------------------------------------------------------ */
function IconBadge({ color, bg, size = 38, children }) {
  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0"
      style={{ width: size, height: size, background: bg, color }}
    >
      {children}
    </div>
  );
}

function Sheet({ title, onClose, children, accent = C.primary }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bd-body" style={{ background: "rgba(52,40,31,0.4)" }} onClick={onClose}>
      <div
        className="w-full max-w-md bg-white rounded-t-3xl max-h-[88vh] flex flex-col bd-rise"
        style={{ background: C.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
          <h2 className="bd-display text-xl" style={{ color: C.ink, fontWeight: 600 }}>{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full flex items-center justify-center cursor-pointer transition-colors"
            style={{ width: 32, height: 32, background: C.surfaceAlt, color: C.inkMuted }}
          >
            <X size={17} />
          </button>
        </div>
        <div className="overflow-y-auto bd-scroll px-5 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm mb-1.5" style={{ color: C.inkMuted, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: `1.5px solid ${C.border}`,
  fontSize: 16,
  color: C.ink,
  background: C.surface,
  outline: "none",
};

function TextInput(props) {
  return <input {...props} className="bd-body" style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function TextArea(props) {
  return <textarea {...props} className="bd-body" style={{ ...inputStyle, resize: "vertical", minHeight: 80, ...(props.style || {}) }} />;
}

function SegButton({ options, value, onChange, colorMap }) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        const c = (colorMap && colorMap[opt.value]) || C.primary;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex-1 py-2.5 rounded-xl text-sm cursor-pointer transition-all bd-body"
            style={{
              fontWeight: 600,
              background: active ? c : C.surfaceAlt,
              color: active ? "#fff" : C.inkMuted,
              border: `1.5px solid ${active ? c : C.border}`,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function PrimaryButton({ children, onClick, color = C.primary, disabled, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-2xl text-base cursor-pointer transition-transform active:scale-[0.98] bd-body"
      style={{
        fontWeight: 600,
        background: disabled ? C.inkFaint : color,
        color: "#fff",
        opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, color = C.danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full py-2.5 rounded-2xl text-sm cursor-pointer bd-body"
      style={{ fontWeight: 600, color, background: "transparent", border: `1.5px solid ${C.border}` }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Day Ring — signature visualization                                  */
/* ------------------------------------------------------------------ */
function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
function arcPath(cx, cy, r, a0, a1) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}
function minutesToAngle(mins) {
  return (mins / 1440) * 360;
}

function DayRing({ selectedDate, events, now, activeTimer }) {
  const { start, end } = dayBounds(selectedDate);
  const cx = 120, cy = 116, R = 82;
  const isToday = isSameDay(selectedDate, now);

  const sleeps = [];
  const feeds = [];
  const diapers = [];

  events.forEach((ev) => {
    if (ev.type === "sleep") {
      const s = new Date(ev.timestamp);
      const e = new Date(ev.endTimestamp);
      if (e > start && s < end) {
        const clipS = s < start ? start : s;
        const clipE = e > end ? end : e;
        const a0 = minutesToAngle((clipS - start) / 60000);
        const a1 = minutesToAngle((clipE - start) / 60000);
        if (a1 > a0) sleeps.push([a0, a1]);
      }
    } else if (ev.type === "feed") {
      const t = new Date(ev.timestamp);
      if (t >= start && t < end) feeds.push(minutesToAngle((t - start) / 60000));
    } else if (ev.type === "diaper") {
      const t = new Date(ev.timestamp);
      if (t >= start && t < end) diapers.push(minutesToAngle((t - start) / 60000));
    }
  });

  // active timer, if ongoing sleep and viewing today
  if (isToday && activeTimer && activeTimer.type === "sleep") {
    const s = new Date(activeTimer.startedAt);
    const clipS = s < start ? start : s;
    const a0 = minutesToAngle((clipS - start) / 60000);
    const a1 = minutesToAngle((now - start) / 60000);
    if (a1 > a0) sleeps.push([a0, a1, true]);
  }

  const nowAngle = isToday ? minutesToAngle((now - start) / 60000) : null;
  const ticks = [0, 3, 6, 9, 12, 15, 18, 21];
  const tickLabel = { 0: "12A", 6: "6A", 12: "12P", 18: "6P" };

  return (
    <svg viewBox="0 0 240 240" className="w-full h-auto">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.border} strokeWidth={14} />
      {sleeps.map(([a0, a1, live], i) => (
        <path
          key={i}
          d={arcPath(cx, cy, R, a0, a1)}
          fill="none"
          stroke={C.sleep}
          strokeWidth={14}
          strokeLinecap="round"
          opacity={live ? 0.85 : 1}
          className={live ? "bd-pulse" : ""}
        />
      ))}
      {ticks.map((h) => {
        const a = minutesToAngle(h * 60);
        const [x1, y1] = polar(cx, cy, R - 10, a);
        const [x2, y2] = polar(cx, cy, R + 10, a);
        const [lx, ly] = polar(cx, cy, R + 22, a);
        return (
          <g key={h}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.border} strokeWidth={1.5} />
            {tickLabel[h] && (
              <text x={lx} y={ly + 3} fontSize="9" fill={C.inkFaint} textAnchor="middle" className="bd-mono">
                {tickLabel[h]}
              </text>
            )}
          </g>
        );
      })}
      {feeds.map((a, i) => {
        const [x, y] = polar(cx, cy, R + 20, a);
        return <circle key={"f" + i} cx={x} cy={y} r={5} fill={C.feed} stroke={C.surface} strokeWidth={1.5} />;
      })}
      {diapers.map((a, i) => {
        const [x, y] = polar(cx, cy, R - 20, a);
        return <circle key={"d" + i} cx={x} cy={y} r={5} fill={C.diaper} stroke={C.surface} strokeWidth={1.5} />;
      })}
      {nowAngle !== null && (
        <>
          {(() => {
            const [x, y] = polar(cx, cy, R + 4, nowAngle);
            const [cx2, cy2] = polar(cx, cy, R - 4, nowAngle);
            return <line x1={cx2} y1={cy2} x2={x} y2={y} stroke={C.ink} strokeWidth={2} strokeLinecap="round" />;
          })()}
          {(() => {
            const [x, y] = polar(cx, cy, R + 4, nowAngle);
            return <circle cx={x} cy={y} r={3.5} fill={C.ink} />;
          })()}
        </>
      )}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fill={C.inkMuted} className="bd-body" fontWeight={600}>
        {sleeps.length ? durationStr(sleeps.reduce((sum, [a0, a1]) => sum + (a1 - a0) * 4, 0)) : "0m"}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill={C.inkFaint} className="bd-body">
        sleep {isToday ? "today" : "that day"}
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Onboarding                                                          */
/* ------------------------------------------------------------------ */
function Onboarding({ onSave }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");

  const canSave = name.trim() && birthDate;

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bd-body" style={{ background: C.bg }}>
      {FONTS}
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-6">
          <IconBadge color={C.primary} bg={C.primaryLight} size={64}>
            <Sparkles size={30} />
          </IconBadge>
        </div>
        <h1 className="bd-display text-3xl text-center mb-2" style={{ color: C.ink, fontWeight: 600 }}>Little Days</h1>
        <p className="text-center text-sm mb-8" style={{ color: C.inkMuted }}>
          A gentle place to track feeds, sleep, diapers, and the little moments in between.
        </p>
        <Field label="Baby's name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nora" autoFocus />
        </Field>
        <Field label="Date of birth">
          <TextInput type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} max={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Field label="Time of birth (optional)">
          <TextInput type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} />
        </Field>
        <PrimaryButton
          disabled={!canSave}
          onClick={() => {
            if (!canSave) return;
            const iso = birthTime ? `${birthDate}T${birthTime}` : `${birthDate}T00:00`;
            onSave({ name: name.trim(), birthDate: iso });
          }}
        >
          Start tracking
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feed / Sleep / Diaper / Journal / Growth Modals                     */
/* ------------------------------------------------------------------ */
function toInputDateTime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function FeedModal({ onClose, onSave, onStartTimer, editing }) {
  const [method, setMethod] = useState(editing?.method || "breast");
  const [side, setSide] = useState(editing?.side || "left");
  const [minutes, setMinutes] = useState(editing?.durationMs ? Math.round(editing.durationMs / 60000) : 10);
  const [amount, setAmount] = useState(editing?.amount ?? 4);
  const [food, setFood] = useState(editing?.food || "");
  const [when, setWhen] = useState(toInputDateTime(editing ? new Date(editing.timestamp) : new Date()));
  const [note, setNote] = useState(editing?.note || "");

  const save = () => {
    const timestamp = new Date(when).toISOString();
    const base = { id: editing?.id || uid(), type: "feed", timestamp, method, note: note.trim() };
    let payload = base;
    if (method === "breast") {
      const ms = Math.max(1, Number(minutes)) * 60000;
      payload = { ...base, side, durationMs: ms };
    } else if (method === "bottle") {
      payload = { ...base, amount: Number(amount) };
    } else {
      payload = { ...base, food: food.trim() || "Solid food" };
    }
    onSave(payload);
  };

  return (
    <Sheet title={editing ? "Edit feed" : "Log a feed"} onClose={onClose} accent={C.feed}>
      <Field label="Type">
        <SegButton
          value={method}
          onChange={setMethod}
          options={[{ label: "Breast", value: "breast" }, { label: "Bottle", value: "bottle" }, { label: "Solid", value: "solid" }]}
          colorMap={{ breast: C.feed, bottle: C.feed, solid: C.feed }}
        />
      </Field>

      {method === "breast" && (
        <>
          <Field label="Side">
            <SegButton
              value={side}
              onChange={setSide}
              options={[{ label: "Left", value: "left" }, { label: "Right", value: "right" }, { label: "Both", value: "both" }]}
              colorMap={{ left: C.feed, right: C.feed, both: C.feed }}
            />
          </Field>
          {!editing && (
            <button
              type="button"
              onClick={() => onStartTimer(side)}
              className="w-full mb-4 py-3 rounded-2xl text-sm cursor-pointer flex items-center justify-center gap-2 bd-body"
              style={{ fontWeight: 600, color: C.feed, background: C.feedLight, border: `1.5px solid ${C.feed}` }}
            >
              <Clock3 size={16} /> Start live timer instead
            </button>
          )}
          <Field label="Duration (minutes)">
            <TextInput type="number" min="0" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </Field>
        </>
      )}

      {method === "bottle" && (
        <Field label="Amount (oz)">
          <TextInput type="number" min="0" step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>
      )}

      {method === "solid" && (
        <Field label="Food">
          <TextInput value={food} onChange={(e) => setFood(e.target.value)} placeholder="e.g. Sweet potato & oats" />
        </Field>
      )}

      <Field label="Time">
        <TextInput type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <Field label="Note (optional)">
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything worth remembering..." />
      </Field>
      <PrimaryButton color={C.feed} onClick={save}>{editing ? "Save changes" : "Log feed"}</PrimaryButton>
    </Sheet>
  );
}

function SleepModal({ onClose, onSave, onStartTimer, editing }) {
  const now = new Date();
  const [start, setStart] = useState(toInputDateTime(editing ? new Date(editing.timestamp) : new Date(now.getTime() - 30 * 60000)));
  const [end, setEnd] = useState(toInputDateTime(editing ? new Date(editing.endTimestamp) : now));
  const [note, setNote] = useState(editing?.note || "");

  const save = () => {
    const s = new Date(start);
    const e = new Date(end);
    if (e <= s) return;
    onSave({
      id: editing?.id || uid(),
      type: "sleep",
      timestamp: s.toISOString(),
      endTimestamp: e.toISOString(),
      durationMs: e - s,
      note: note.trim(),
    });
  };

  return (
    <Sheet title={editing ? "Edit sleep" : "Log sleep"} onClose={onClose} accent={C.sleep}>
      {!editing && (
        <button
          type="button"
          onClick={onStartTimer}
          className="w-full mb-4 py-3 rounded-2xl text-sm cursor-pointer flex items-center justify-center gap-2 bd-body"
          style={{ fontWeight: 600, color: C.sleep, background: C.sleepLight, border: `1.5px solid ${C.sleep}` }}
        >
          <Clock3 size={16} /> Start live sleep timer instead
        </button>
      )}
      <Field label="Fell asleep">
        <TextInput type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
      </Field>
      <Field label="Woke up">
        <TextInput type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
      </Field>
      <Field label="Note (optional)">
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Where did they sleep, how did it go..." />
      </Field>
      <PrimaryButton color={C.sleep} onClick={save}>{editing ? "Save changes" : "Log sleep"}</PrimaryButton>
    </Sheet>
  );
}

function DiaperModal({ onClose, onSave, editing }) {
  const [kind, setKind] = useState(editing?.kind || "wet");
  const [when, setWhen] = useState(toInputDateTime(editing ? new Date(editing.timestamp) : new Date()));
  const [note, setNote] = useState(editing?.note || "");

  const save = () => {
    onSave({ id: editing?.id || uid(), type: "diaper", timestamp: new Date(when).toISOString(), kind, note: note.trim() });
  };

  return (
    <Sheet title={editing ? "Edit diaper" : "Log a diaper"} onClose={onClose} accent={C.diaper}>
      <Field label="Type">
        <SegButton
          value={kind}
          onChange={setKind}
          options={[{ label: "Wet", value: "wet" }, { label: "Dirty", value: "dirty" }, { label: "Both", value: "both" }]}
          colorMap={{ wet: C.diaper, dirty: C.diaper, both: C.diaper }}
        />
      </Field>
      <Field label="Time">
        <TextInput type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <Field label="Note (optional)">
        <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rash, color, anything unusual..." />
      </Field>
      <PrimaryButton color={C.diaper} onClick={save}>{editing ? "Save changes" : "Log diaper"}</PrimaryButton>
    </Sheet>
  );
}

function JournalModal({ onClose, onSave, editing }) {
  const [title, setTitle] = useState(editing?.title || "");
  const [text, setText] = useState(editing?.text || "");
  const [milestone, setMilestone] = useState(editing?.milestone || false);
  const [when, setWhen] = useState((editing ? new Date(editing.timestamp) : new Date()).toISOString().slice(0, 10));

  const save = () => {
    if (!text.trim()) return;
    onSave({
      id: editing?.id || uid(),
      title: title.trim(),
      text: text.trim(),
      milestone,
      timestamp: new Date(when + "T12:00").toISOString(),
    });
  };

  return (
    <Sheet title={editing ? "Edit entry" : "New journal entry"} onClose={onClose} accent={C.journal}>
      <Field label="Title (optional)">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. First laugh" />
      </Field>
      <Field label="Date">
        <TextInput type="date" value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <Field label="What happened">
        <TextArea value={text} onChange={(e) => setText(e.target.value)} placeholder="Tell the story..." style={{ minHeight: 120 }} />
      </Field>
      <button
        type="button"
        onClick={() => setMilestone((m) => !m)}
        className="w-full mb-4 py-2.5 rounded-2xl text-sm cursor-pointer flex items-center justify-center gap-2 bd-body"
        style={{
          fontWeight: 600,
          color: milestone ? "#fff" : C.journal,
          background: milestone ? C.journal : C.journalLight,
          border: `1.5px solid ${C.journal}`,
        }}
      >
        <Sparkles size={15} /> {milestone ? "Marked as milestone" : "Mark as milestone"}
      </button>
      <PrimaryButton color={C.journal} onClick={save} disabled={!text.trim()}>{editing ? "Save changes" : "Save entry"}</PrimaryButton>
    </Sheet>
  );
}

function GrowthModal({ onClose, onSave, editing }) {
  const [when, setWhen] = useState((editing ? new Date(editing.date) : new Date()).toISOString().slice(0, 10));
  const [lb, setLb] = useState(editing?.weightLb ?? "");
  const [oz, setOz] = useState(editing?.weightOz ?? "");
  const [height, setHeight] = useState(editing?.heightIn ?? "");
  const [head, setHead] = useState(editing?.headIn ?? "");
  const [note, setNote] = useState(editing?.note || "");

  const save = () => {
    onSave({
      id: editing?.id || uid(),
      date: new Date(when + "T12:00").toISOString(),
      weightLb: lb === "" ? null : Number(lb),
      weightOz: oz === "" ? null : Number(oz),
      heightIn: height === "" ? null : Number(height),
      headIn: head === "" ? null : Number(head),
      note: note.trim(),
    });
  };

  return (
    <Sheet title={editing ? "Edit measurement" : "Add measurement"} onClose={onClose} accent={C.primary}>
      <Field label="Date">
        <TextInput type="date" value={when} onChange={(e) => setWhen(e.target.value)} />
      </Field>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Weight (lb)">
            <TextInput type="number" min="0" value={lb} onChange={(e) => setLb(e.target.value)} placeholder="0" />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Weight (oz)">
            <TextInput type="number" min="0" max="15" value={oz} onChange={(e) => setOz(e.target.value)} placeholder="0" />
          </Field>
        </div>
      </div>
      <Field label="Height (in)">
        <TextInput type="number" min="0" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Head circumference (in)">
        <TextInput type="number" min="0" step="0.1" value={head} onChange={(e) => setHead(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Note (optional)">
        <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. 2-month checkup" />
      </Field>
      <PrimaryButton onClick={save}>{editing ? "Save changes" : "Add measurement"}</PrimaryButton>
    </Sheet>
  );
}

function ProfileModal({ onClose, onSave, onReset, onSignOut, profile }) {
  const [name, setName] = useState(profile.name);
  const [birthDate, setBirthDate] = useState(profile.birthDate.slice(0, 16));
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <Sheet title="Settings" onClose={onClose}>
      <Field label="Baby's name">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Date & time of birth">
        <TextInput type="datetime-local" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
      </Field>
      <div className="mb-6">
        <PrimaryButton onClick={() => onSave({ name: name.trim(), birthDate: new Date(birthDate).toISOString() })}>
          Save changes
        </PrimaryButton>
      </div>
      {onSignOut && (
        <div className="mb-6">
          <GhostButton color={C.inkMuted} onClick={onSignOut}>Sign out</GhostButton>
        </div>
      )}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
        {!confirmReset ? (
          <GhostButton onClick={() => setConfirmReset(true)}>Reset all data</GhostButton>
        ) : (
          <div className="rounded-2xl p-3" style={{ background: C.dangerLight }}>
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle size={16} color={C.danger} style={{ marginTop: 2, flexShrink: 0 }} />
              <p className="text-sm" style={{ color: C.danger }}>
                This permanently deletes every feed, sleep, diaper, journal, and growth entry. This can't be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmReset(false)}
                className="flex-1 py-2 rounded-xl text-sm cursor-pointer bd-body"
                style={{ fontWeight: 600, background: C.surface, color: C.inkMuted, border: `1.5px solid ${C.border}` }}
              >
                Cancel
              </button>
              <button
                onClick={onReset}
                className="flex-1 py-2 rounded-xl text-sm cursor-pointer bd-body"
                style={{ fontWeight: 600, background: C.danger, color: "#fff" }}
              >
                Yes, delete everything
              </button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/* Event row / list                                                    */
/* ------------------------------------------------------------------ */
function eventIcon(ev) {
  if (ev.type === "feed") return { Icon: Milk, color: C.feed, bg: C.feedLight };
  if (ev.type === "sleep") return { Icon: Moon, color: C.sleep, bg: C.sleepLight };
  return { Icon: Droplets, color: C.diaper, bg: C.diaperLight };
}
function eventTitle(ev) {
  if (ev.type === "feed") {
    if (ev.method === "breast") return `Breastfed · ${ev.side === "both" ? "both sides" : ev.side}`;
    if (ev.method === "bottle") return `Bottle · ${ev.amount} oz`;
    return `Solids · ${ev.food || "food"}`;
  }
  if (ev.type === "sleep") return `Sleep · ${durationStr(ev.durationMs)}`;
  return `Diaper · ${ev.kind}`;
}
function eventSubtitle(ev) {
  if (ev.type === "sleep") return `${clockStr(new Date(ev.timestamp))} – ${clockStr(new Date(ev.endTimestamp))}`;
  if (ev.type === "feed" && ev.method === "breast") return `${durationStr(ev.durationMs)} · ${clockStr(new Date(ev.timestamp))}`;
  return clockStr(new Date(ev.timestamp));
}

function EventRow({ ev, onEdit, onDelete }) {
  const { Icon, color, bg } = eventIcon(ev);
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl mb-2" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-3 cursor-pointer text-left"
      >
        <IconBadge color={color} bg={bg}><Icon size={18} /></IconBadge>
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate" style={{ color: C.ink, fontWeight: 600 }}>{eventTitle(ev)}</p>
          <p className="text-xs" style={{ color: C.inkMuted }}>{eventSubtitle(ev)}</p>
        </div>
      </button>
      {open && (
        <div className="flex gap-2 px-3 pb-3">
          {ev.note && (
            <p className="text-xs flex-1 self-center italic" style={{ color: C.inkMuted }}>"{ev.note}"</p>
          )}
          <button
            onClick={() => onEdit(ev)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs cursor-pointer bd-body ml-auto"
            style={{ fontWeight: 600, background: C.surfaceAlt, color: C.ink }}
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={() => onDelete(ev.id)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs cursor-pointer bd-body"
            style={{ fontWeight: 600, background: C.dangerLight, color: C.danger }}
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Screens                                                              */
/* ------------------------------------------------------------------ */
function TodayScreen({ profile, events, now, selectedDate, setSelectedDate, activeTimer, onQuickAction, onEdit, onDelete, onEndSleep, onOpenSettings }) {
  const { start, end } = dayBounds(selectedDate);
  const dayEvents = events
    .filter((ev) => {
      const t = new Date(ev.timestamp);
      return t >= start && t < end;
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const lastOf = (type) => {
    const list = events.filter((e) => e.type === type).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return list[0];
  };
  const lastFeed = lastOf("feed");
  const lastSleep = lastOf("sleep");
  const lastDiaper = lastOf("diaper");

  const feedCount = dayEvents.filter((e) => e.type === "feed").length;
  const diaperCount = dayEvents.filter((e) => e.type === "diaper").length;

  const isToday = isSameDay(selectedDate, now);

  return (
    <div className="flex-1 overflow-y-auto bd-scroll pb-28">
      <div className="px-5 pt-6 pb-2 flex items-start justify-between">
        <div>
          <p className="text-xs mb-0.5" style={{ color: C.inkMuted, fontWeight: 500 }}>{ageString(new Date(profile.birthDate), now)}</p>
          <h1 className="bd-display text-2xl" style={{ color: C.ink, fontWeight: 600 }}>{profile.name}</h1>
        </div>
        <button
          onClick={onOpenSettings}
          className="rounded-full flex items-center justify-center cursor-pointer"
          style={{ width: 38, height: 38, background: C.surface, border: `1px solid ${C.border}`, color: C.inkMuted }}
          aria-label="Settings"
        >
          <Settings2 size={17} />
        </button>
      </div>

      {activeTimer && (
        <div className="mx-5 mt-2 mb-1 rounded-2xl p-3.5 flex items-center gap-3 bd-pulse"
          style={{ background: activeTimer.type === "sleep" ? C.sleepLight : C.feedLight }}>
          <IconBadge color={activeTimer.type === "sleep" ? C.sleep : C.feed} bg="#ffffffaa">
            {activeTimer.type === "sleep" ? <Moon size={18} /> : <Milk size={18} />}
          </IconBadge>
          <div className="flex-1">
            <p className="text-sm" style={{ fontWeight: 700, color: C.ink }}>
              {activeTimer.type === "sleep" ? "Sleeping" : `Feeding · ${activeTimer.side}`}
            </p>
            <p className="text-xs bd-mono" style={{ color: C.inkMuted }}>
              since {clockStr(new Date(activeTimer.startedAt))} · {durationStr(now - new Date(activeTimer.startedAt))}
            </p>
          </div>
          <button
            onClick={onEndSleep}
            className="px-4 py-2 rounded-full text-xs cursor-pointer bd-body"
            style={{ fontWeight: 700, background: activeTimer.type === "sleep" ? C.sleep : C.feed, color: "#fff" }}
          >
            End
          </button>
        </div>
      )}

      {/* date nav */}
      <div className="flex items-center justify-center gap-4 px-5 mt-3 mb-1">
        <button
          onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
          className="rounded-full p-1.5 cursor-pointer" style={{ color: C.inkMuted }} aria-label="Previous day"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm w-40 text-center" style={{ color: C.inkMuted, fontWeight: 600 }}>
          {isToday ? "Today" : dateStr(selectedDate)}
        </p>
        <button
          onClick={() => !isToday && setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
          className="rounded-full p-1.5"
          style={{ color: isToday ? C.inkFaint : C.inkMuted, cursor: isToday ? "default" : "pointer" }}
          disabled={isToday}
          aria-label="Next day"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="px-8 py-2">
        <DayRing selectedDate={selectedDate} events={events} now={now} activeTimer={activeTimer} />
      </div>

      <div className="flex justify-center gap-5 px-5 mb-4 text-xs" style={{ color: C.inkMuted }}>
        <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, borderRadius: 99, background: C.sleep, display: "inline-block" }} /> sleep</span>
        <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, borderRadius: 99, background: C.feed, display: "inline-block" }} /> {feedCount} feeds</span>
        <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, borderRadius: 99, background: C.diaper, display: "inline-block" }} /> {diaperCount} diapers</span>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-4 gap-2 px-5 mb-5">
        {[
          { key: "feed", label: "Feed", Icon: Milk, color: C.feed, bg: C.feedLight },
          { key: "sleep", label: activeTimer?.type === "sleep" ? "Sleeping" : "Sleep", Icon: Moon, color: C.sleep, bg: C.sleepLight },
          { key: "diaper", label: "Diaper", Icon: Droplets, color: C.diaper, bg: C.diaperLight },
          { key: "journal", label: "Journal", Icon: NotebookPen, color: C.journal, bg: C.journalLight },
        ].map((a) => (
          <button
            key={a.key}
            onClick={() => onQuickAction(a.key)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl cursor-pointer transition-transform active:scale-95"
            style={{ background: a.bg }}
          >
            <a.Icon size={20} color={a.color} />
            <span className="text-xs" style={{ color: a.color, fontWeight: 700 }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* last activity */}
      <div className="grid grid-cols-3 gap-2 px-5 mb-5">
        {[
          { ev: lastFeed, label: "Last feed", color: C.feed },
          { ev: lastSleep, label: "Last sleep", color: C.sleep },
          { ev: lastDiaper, label: "Last diaper", color: C.diaper },
        ].map((x, i) => (
          <div key={i} className="rounded-2xl p-3" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <p className="text-[11px] mb-1" style={{ color: C.inkMuted, fontWeight: 500 }}>{x.label}</p>
            <p className="text-sm bd-mono" style={{ color: x.color, fontWeight: 700 }}>
              {x.ev ? timeAgo(new Date(x.ev.timestamp), now) : "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="px-5">
        <p className="text-sm mb-2" style={{ color: C.ink, fontWeight: 700 }}>
          {isToday ? "Today's activity" : `Activity on ${dateStr(selectedDate)}`}
        </p>
        {dayEvents.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: C.surface, border: `1px dashed ${C.border}` }}>
            <p className="text-sm" style={{ color: C.inkMuted }}>Nothing logged {isToday ? "yet" : "that day"}. Tap a button above to add the first entry.</p>
          </div>
        ) : (
          dayEvents.map((ev) => <EventRow key={ev.id} ev={ev} onEdit={onEdit} onDelete={onDelete} />)
        )}
      </div>
    </div>
  );
}

function LogScreen({ events, now, onEdit, onDelete, onAdd }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? events : events.filter((e) => e.type === filter);
  const sorted = [...filtered].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const groups = [];
  let curKey = null;
  sorted.forEach((ev) => {
    const d = new Date(ev.timestamp);
    const key = d.toDateString();
    if (key !== curKey) {
      groups.push({ key, label: dateStr(d), items: [] });
      curKey = key;
    }
    groups[groups.length - 1].items.push(ev);
  });

  return (
    <div className="flex-1 overflow-y-auto bd-scroll pb-28">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <h1 className="bd-display text-2xl" style={{ color: C.ink, fontWeight: 600 }}>Log</h1>
        <button
          onClick={onAdd}
          className="rounded-full flex items-center justify-center cursor-pointer"
          style={{ width: 38, height: 38, background: C.primary, color: "#fff" }}
          aria-label="Add entry"
        >
          <Plus size={19} />
        </button>
      </div>
      <div className="flex gap-2 px-5 mb-4 overflow-x-auto bd-scroll">
        {[
          { key: "all", label: "All" },
          { key: "feed", label: "Feeds" },
          { key: "sleep", label: "Sleep" },
          { key: "diaper", label: "Diapers" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap cursor-pointer bd-body"
            style={{
              fontWeight: 600,
              background: filter === f.key ? C.ink : C.surface,
              color: filter === f.key ? "#fff" : C.inkMuted,
              border: `1px solid ${filter === f.key ? C.ink : C.border}`,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="px-5">
        {groups.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ background: C.surface, border: `1px dashed ${C.border}` }}>
            <p className="text-sm" style={{ color: C.inkMuted }}>No entries yet.</p>
          </div>
        )}
        {groups.map((g) => (
          <div key={g.key} className="mb-5">
            <p className="text-xs mb-2" style={{ color: C.inkFaint, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>{g.label}</p>
            {g.items.map((ev) => <EventRow key={ev.id} ev={ev} onEdit={onEdit} onDelete={onDelete} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function GrowthScreen({ growth, onAdd, onEdit, onDelete, birthDate }) {
  const [metric, setMetric] = useState("weight");
  const sorted = [...growth].sort((a, b) => new Date(a.date) - new Date(b.date));

  const chartData = sorted.map((g) => ({
    date: new Date(g.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    weight: g.weightLb != null || g.weightOz != null ? Number(((g.weightLb || 0) + (g.weightOz || 0) / 16).toFixed(2)) : null,
    height: g.heightIn,
    head: g.headIn,
  }));

  const metricMeta = {
    weight: { label: "Weight", unit: "lb", color: C.primary, key: "weight" },
    height: { label: "Height", unit: "in", color: C.feed, key: "height" },
    head: { label: "Head circumference", unit: "in", color: C.sleep, key: "head" },
  };
  const m = metricMeta[metric];

  const displayList = [...growth].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="flex-1 overflow-y-auto bd-scroll pb-28">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <h1 className="bd-display text-2xl" style={{ color: C.ink, fontWeight: 600 }}>Growth</h1>
        <button
          onClick={onAdd}
          className="rounded-full flex items-center justify-center cursor-pointer"
          style={{ width: 38, height: 38, background: C.primary, color: "#fff" }}
          aria-label="Add measurement"
        >
          <Plus size={19} />
        </button>
      </div>

      <div className="flex gap-2 px-5 mb-4">
        {Object.entries(metricMeta).map(([key, mm]) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className="px-3 py-1.5 rounded-full text-xs cursor-pointer bd-body"
            style={{
              fontWeight: 600,
              background: metric === key ? mm.color : C.surface,
              color: metric === key ? "#fff" : C.inkMuted,
              border: `1px solid ${metric === key ? mm.color : C.border}`,
            }}
          >
            {mm.label}
          </button>
        ))}
      </div>

      <div className="mx-5 rounded-2xl p-4 mb-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        {chartData.filter((d) => d[m.key] != null).length >= 2 ? (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={C.border} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.inkMuted }} axisLine={{ stroke: C.border }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.inkMuted }} axisLine={false} tickLine={false} width={34} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: `1px solid ${C.border}`, fontSize: 12, fontFamily: "Inter" }}
                  formatter={(v) => [`${v} ${m.unit}`, m.label]}
                />
                <Line type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2.5} dot={{ r: 4, fill: m.color }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm" style={{ color: C.inkMuted }}>Add at least two measurements to see a chart.</p>
          </div>
        )}
      </div>

      <div className="px-5">
        <p className="text-sm mb-2" style={{ color: C.ink, fontWeight: 700 }}>All measurements</p>
        {displayList.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ background: C.surface, border: `1px dashed ${C.border}` }}>
            <p className="text-sm" style={{ color: C.inkMuted }}>No measurements yet.</p>
          </div>
        )}
        {displayList.map((g) => (
          <GrowthRow key={g.id} g={g} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function GrowthRow({ g, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const w = g.weightLb != null || g.weightOz != null ? `${g.weightLb || 0} lb ${g.weightOz || 0} oz` : null;
  const parts = [];
  if (w) parts.push(w);
  if (g.heightIn != null) parts.push(`${g.heightIn} in tall`);
  if (g.headIn != null) parts.push(`${g.headIn} in head`);
  return (
    <div className="rounded-2xl mb-2" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 p-3 cursor-pointer text-left">
        <IconBadge color={C.primary} bg={C.primaryLight}><TrendingUp size={16} /></IconBadge>
        <div className="flex-1 min-w-0">
          <p className="text-sm" style={{ color: C.ink, fontWeight: 600 }}>{parts.join(" · ") || "Measurement"}</p>
          <p className="text-xs" style={{ color: C.inkMuted }}>{dateStr(new Date(g.date))}</p>
        </div>
      </button>
      {open && (
        <div className="flex gap-2 px-3 pb-3">
          {g.note && <p className="text-xs flex-1 self-center italic" style={{ color: C.inkMuted }}>"{g.note}"</p>}
          <button onClick={() => onEdit(g)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs cursor-pointer bd-body ml-auto" style={{ fontWeight: 600, background: C.surfaceAlt, color: C.ink }}><Pencil size={12} /> Edit</button>
          <button onClick={() => onDelete(g.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs cursor-pointer bd-body" style={{ fontWeight: 600, background: C.dangerLight, color: C.danger }}><Trash2 size={12} /> Delete</button>
        </div>
      )}
    </div>
  );
}

function JournalScreen({ journal, onAdd, onEdit, onDelete }) {
  const sorted = [...journal].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const [openId, setOpenId] = useState(null);
  return (
    <div className="flex-1 overflow-y-auto bd-scroll pb-28">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <h1 className="bd-display text-2xl" style={{ color: C.ink, fontWeight: 600 }}>Journal</h1>
        <button
          onClick={onAdd}
          className="rounded-full flex items-center justify-center cursor-pointer"
          style={{ width: 38, height: 38, background: C.primary, color: "#fff" }}
          aria-label="Add entry"
        >
          <Plus size={19} />
        </button>
      </div>
      <div className="px-5">
        {sorted.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ background: C.surface, border: `1px dashed ${C.border}` }}>
            <p className="text-sm" style={{ color: C.inkMuted }}>No entries yet. Capture a first smile, a new word, or just how today felt.</p>
          </div>
        )}
        {sorted.map((j) => (
          <div key={j.id} className="rounded-2xl mb-3 p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                {j.milestone && <IconBadge color={C.journal} bg={C.journalLight} size={26}><Sparkles size={13} /></IconBadge>}
                <p className="bd-display text-base" style={{ color: C.ink, fontWeight: 600 }}>{j.title || dateStr(new Date(j.timestamp))}</p>
              </div>
            </div>
            <p className="text-xs mb-2" style={{ color: C.inkMuted }}>{dateStr(new Date(j.timestamp), { month: "long", day: "numeric", year: "numeric" })}</p>
            <p className="text-sm leading-relaxed" style={{ color: C.ink }}>{j.text}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => onEdit(j)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs cursor-pointer bd-body" style={{ fontWeight: 600, background: C.surfaceAlt, color: C.ink }}><Pencil size={12} /> Edit</button>
              <button onClick={() => onDelete(j.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs cursor-pointer bd-body" style={{ fontWeight: 600, background: C.dangerLight, color: C.danger }}><Trash2 size={12} /> Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom nav                                                           */
/* ------------------------------------------------------------------ */
function BottomNav({ tab, setTab }) {
  const items = [
    { key: "today", label: "Today", Icon: Sun },
    { key: "log", label: "Log", Icon: ListChecks },
    { key: "growth", label: "Growth", Icon: TrendingUp },
    { key: "journal", label: "Journal", Icon: NotebookPen },
  ];
  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex justify-center z-30"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="w-full max-w-md flex" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
        {items.map((it) => {
          const active = tab === it.key;
          return (
            <button
              key={it.key}
              onClick={() => setTab(it.key)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 cursor-pointer bd-body"
              style={{ color: active ? C.primary : C.inkFaint }}
            >
              <it.Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[11px]" style={{ fontWeight: active ? 700 : 500 }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                   */
/* ------------------------------------------------------------------ */
export default function App({ onSignOut } = {}) {
  const [loaded, setLoaded] = useState(false);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [journal, setJournal] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);

  const [tab, setTab] = useState("today");
  const [now, setNow] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [modal, setModal] = useState(null); // { kind, editing }

  useEffect(() => {
    (async () => {
      const [p, ev, gr, jr, tm] = await Promise.all([
        loadKey("profile", null),
        loadKey("events", []),
        loadKey("growth", []),
        loadKey("journal", []),
        loadKey("active-timer", null),
      ]);
      setProfile(p);
      setEvents(ev);
      setGrowth(gr);
      setJournal(jr);
      setActiveTimer(tm);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(t);
  }, []);

  const saveProfile = async (p) => {
    setProfile(p);
    await saveKey("profile", p);
  };
  const saveEvents = async (list) => {
    setEvents(list);
    await saveKey("events", list);
  };
  const saveGrowth = async (list) => {
    setGrowth(list);
    await saveKey("growth", list);
  };
  const saveJournal = async (list) => {
    setJournal(list);
    await saveKey("journal", list);
  };
  const saveTimer = async (t) => {
    setActiveTimer(t);
    await saveKey("active-timer", t);
  };

  const upsert = (list, item) => {
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx === -1) return [...list, item];
    const copy = [...list];
    copy[idx] = item;
    return copy;
  };

  const handleQuickAction = (key) => {
    if (key === "sleep") {
      if (activeTimer?.type === "sleep") return; // banner handles end
      setModal({ kind: "sleep" });
    } else if (key === "feed") {
      setModal({ kind: "feed" });
    } else if (key === "diaper") {
      setModal({ kind: "diaper" });
    } else if (key === "journal") {
      setModal({ kind: "journal" });
    }
  };

  const startSleepTimer = async () => {
    await saveTimer({ type: "sleep", startedAt: new Date().toISOString() });
    setModal(null);
  };
  const startFeedTimer = async (side) => {
    await saveTimer({ type: "feed", startedAt: new Date().toISOString(), side });
    setModal(null);
  };
  const endActiveTimer = async () => {
    if (!activeTimer) return;
    const startedAt = new Date(activeTimer.startedAt);
    const end = new Date();
    if (activeTimer.type === "sleep") {
      const ev = { id: uid(), type: "sleep", timestamp: startedAt.toISOString(), endTimestamp: end.toISOString(), durationMs: end - startedAt, note: "" };
      await saveEvents([...events, ev]);
    } else {
      const ev = { id: uid(), type: "feed", timestamp: startedAt.toISOString(), method: "breast", side: activeTimer.side, durationMs: end - startedAt, note: "" };
      await saveEvents([...events, ev]);
    }
    await saveTimer(null);
  };

  const handleSaveEvent = async (ev) => {
    await saveEvents(upsert(events, ev));
    setModal(null);
  };
  const handleDeleteEvent = async (id) => {
    await saveEvents(events.filter((e) => e.id !== id));
  };
  const handleEditEvent = (ev) => setModal({ kind: ev.type, editing: ev });

  const handleSaveGrowth = async (g) => {
    await saveGrowth(upsert(growth, g));
    setModal(null);
  };
  const handleDeleteGrowth = async (id) => {
    await saveGrowth(growth.filter((g) => g.id !== id));
  };

  const handleSaveJournal = async (j) => {
    await saveJournal(upsert(journal, j));
    setModal(null);
  };
  const handleDeleteJournal = async (id) => {
    await saveJournal(journal.filter((j) => j.id !== id));
  };

  if (!loaded) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: C.bg }}>
        {FONTS}
        <p className="text-sm bd-body" style={{ color: C.inkMuted }}>Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return <Onboarding onSave={saveProfile} />;
  }

  return (
    <div className="w-full flex justify-center bd-body" style={{ background: C.bg }}>
      {FONTS}
      <div className="w-full max-w-md min-h-dvh flex flex-col relative" style={{ background: C.bg }}>
        {tab === "today" && (
          <TodayScreen
            profile={profile}
            events={events}
            now={now}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            activeTimer={activeTimer}
            onQuickAction={handleQuickAction}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
            onEndSleep={endActiveTimer}
            onOpenSettings={() => setModal({ kind: "profile" })}
          />
        )}
        {tab === "log" && (
          <LogScreen
            events={events}
            now={now}
            onEdit={handleEditEvent}
            onDelete={handleDeleteEvent}
            onAdd={() => setModal({ kind: "feed" })}
          />
        )}
        {tab === "growth" && (
          <GrowthScreen
            growth={growth}
            birthDate={profile.birthDate}
            onAdd={() => setModal({ kind: "growth" })}
            onEdit={(g) => setModal({ kind: "growth", editing: g })}
            onDelete={handleDeleteGrowth}
          />
        )}
        {tab === "journal" && (
          <JournalScreen
            journal={journal}
            onAdd={() => setModal({ kind: "journal" })}
            onEdit={(j) => setModal({ kind: "journal", editing: j })}
            onDelete={handleDeleteJournal}
          />
        )}

        <BottomNav tab={tab} setTab={setTab} />

        {modal?.kind === "feed" && (
          <FeedModal
            editing={modal.editing}
            onClose={() => setModal(null)}
            onSave={handleSaveEvent}
            onStartTimer={startFeedTimer}
          />
        )}
        {modal?.kind === "sleep" && (
          <SleepModal
            editing={modal.editing}
            onClose={() => setModal(null)}
            onSave={handleSaveEvent}
            onStartTimer={startSleepTimer}
          />
        )}
        {modal?.kind === "diaper" && (
          <DiaperModal editing={modal.editing} onClose={() => setModal(null)} onSave={handleSaveEvent} />
        )}
        {modal?.kind === "journal" && (
          <JournalModal editing={modal.editing} onClose={() => setModal(null)} onSave={handleSaveJournal} />
        )}
        {modal?.kind === "growth" && (
          <GrowthModal editing={modal.editing} onClose={() => setModal(null)} onSave={handleSaveGrowth} />
        )}
        {modal?.kind === "profile" && (
          <ProfileModal
            profile={profile}
            onClose={() => setModal(null)}
            onSignOut={onSignOut}
            onSave={async (p) => { await saveProfile(p); setModal(null); }}
            onReset={async () => {
              await saveEvents([]);
              await saveGrowth([]);
              await saveJournal([]);
              await saveTimer(null);
              setModal(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
