import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { AppPage, UpgradeNotice } from "../../components/app/AppPage";
import { hasFeature } from "../../lib/tiers";
import { getTrainingPlan, type ScheduleDay, type TrainingPlan } from "../../api/trainingPlan";

const TYPE_STYLE: Record<ScheduleDay["type"], string> = {
  on_ice: "bg-sky-500/20 text-sky-300 border-sky-500/40",
  strength: "bg-brand/20 text-brand border-brand/40",
  conditioning: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  recovery: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  mobility: "bg-violet-500/20 text-violet-300 border-violet-500/40",
  rest: "bg-white/5 text-muted border-white/10",
};
const TYPE_LABEL: Record<ScheduleDay["type"], string> = {
  on_ice: "On-ice",
  strength: "Strength",
  conditioning: "Conditioning",
  recovery: "Recovery",
  mobility: "Mobility",
  rest: "Rest",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const parse = (d: string) => new Date(`${d}T00:00:00`);
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

const Month: React.FC<{
  year: number;
  month: number; // 0-based
  byDate: Map<string, ScheduleDay>;
  onPick: (d: ScheduleDay) => void;
}> = ({ year, month, byDate, onPick }) => {
  const first = new Date(year, month, 1);
  const daysIn = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-start offset
  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysIn }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-xl border border-hair bg-panel p-4">
      <div className="mb-3 font-oswald text-sm font-bold uppercase tracking-wide text-white">
        {first.toLocaleString(undefined, { month: "long", year: "numeric" })}
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const s = byDate.get(iso);
          return (
            <button
              key={i}
              type="button"
              disabled={!s}
              onClick={() => s && onPick(s)}
              className={`flex min-h-[54px] flex-col rounded-md border p-1 text-left transition ${
                s
                  ? `${TYPE_STYLE[s.type]} hover:brightness-125`
                  : "border-white/5 bg-black/10"
              } ${s ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className="text-[10px] font-bold text-white/70">{day}</span>
              {s && (
                <span className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-tight">
                  {s.title}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<ScheduleDay | null>(null);

  useEffect(() => {
    if (!hasFeature(user, "calendar")) {
      setLoading(false);
      return;
    }
    getTrainingPlan()
      .then(setPlan)
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, [user]);

  const reviewed = plan && (plan.status === "curated" || plan.status === "active");

  const { months, byDate } = useMemo(() => {
    const map = new Map<string, ScheduleDay>();
    const monthsSet = new Map<string, { year: number; month: number }>();
    for (const d of plan?.schedule ?? []) {
      map.set(d.date, d);
      const dt = parse(d.date);
      monthsSet.set(monthKey(dt), { year: dt.getFullYear(), month: dt.getMonth() });
    }
    const ms = [...monthsSet.values()].sort(
      (a, b) => a.year - b.year || a.month - b.month
    );
    return { months: ms, byDate: map };
  }, [plan]);

  if (!hasFeature(user, "calendar")) {
    return (
      <AppPage title="Training" accent="Calendar" subtitle="Your weekly training plan.">
        <UpgradeNotice feature="Training Calendar" />
      </AppPage>
    );
  }

  return (
    <AppPage
      title="Training"
      accent="Calendar"
      subtitle="Your coach-approved program, laid out day by day. Click a session for the full detail."
    >
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : !reviewed ? (
        <div className="rounded-xl border border-hair bg-panel p-6">
          <h3 className="font-oswald text-base font-bold uppercase tracking-wide text-white">
            No calendar yet
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">
            Your training calendar appears here once your coach has built and
            approved your program from your{" "}
            <Link to="/app/profile" className="font-semibold text-brand hover:underline">
              Athlete Profile
            </Link>
            .
          </p>
        </div>
      ) : months.length === 0 ? (
        <p className="text-sm text-muted">
          Your program is ready on the{" "}
          <Link to="/app/coaching" className="font-semibold text-brand hover:underline">
            My Program
          </Link>{" "}
          page. A calendar view will appear here after the next generation.
        </p>
      ) : (
        <>
          {/* Legend */}
          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABEL) as ScheduleDay["type"][]).map((t) => (
              <span
                key={t}
                className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${TYPE_STYLE[t]}`}
              >
                {TYPE_LABEL[t]}
              </span>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {months.map((m) => (
              <Month
                key={`${m.year}-${m.month}`}
                year={m.year}
                month={m.month}
                byDate={byDate}
                onPick={setPicked}
              />
            ))}
          </div>
        </>
      )}

      {/* Day detail modal */}
      {picked && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPicked(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-hair bg-panel p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${TYPE_STYLE[picked.type]}`}
                >
                  {TYPE_LABEL[picked.type]}
                </span>
                <h3 className="mt-2 font-display text-xl font-bold text-white">
                  {picked.title}
                </h3>
                <p className="text-xs text-muted">
                  {parse(picked.date).toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="text-sm font-bold text-muted hover:text-white"
              >
                ✕
              </button>
            </div>
            {picked.summary && (
              <p className="mt-3 text-sm text-gray-300">{picked.summary}</p>
            )}
            {picked.detail && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
                {picked.detail}
              </p>
            )}
          </div>
        </div>
      )}
    </AppPage>
  );
};

export default CalendarPage;
