import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AppPage } from "../../components/app/AppPage";
import {
  getTrainingPlan,
  generateTrainingPlan,
  type TrainingPlan,
} from "../../api/trainingPlan";

/**
 * Training program. Generates a personalised off-season program from the
 * athlete's saved questionnaire (AI, from the fixed base briefing), stores it,
 * and displays it. A coach reviews before it's finalised.
 */
const CoachingPage: React.FC = () => {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTrainingPlan()
      .then(setPlan)
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, []);

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      setPlan(await generateTrainingPlan());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AppPage
      title="Training"
      accent="Program"
      subtitle="Your personalised off-season program, generated from your athlete profile and reviewed by a coach."
    >
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hair bg-panel p-5">
            <div>
              <p className="text-sm text-gray-300">
                {plan
                  ? "Your program is ready. Regenerate any time you update your profile."
                  : "Generate your program from your completed athlete profile."}
              </p>
              {plan && (
                <p className="mt-1 text-xs text-muted">
                  Generated {new Date(plan.generatedAt).toLocaleDateString()} ·{" "}
                  {plan.status === "generated"
                    ? "pending coach review"
                    : "reviewed by your coach ✓"}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="shrink-0 rounded-lg bg-brand px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-hero-blue disabled:opacity-50"
            >
              {generating
                ? "Building…"
                : plan
                ? "Regenerate program"
                : "Generate my program"}
            </button>
          </div>

          {generating && (
            <p className="mt-4 text-sm text-muted">
              Building your program from your intake — this can take up to a
              minute. You can leave this page and come back.
            </p>
          )}
          {error && <p className="mt-4 text-sm text-[#ef4444]">{error}</p>}

          {!plan && !generating && !error && (
            <p className="mt-6 text-sm text-muted">
              Haven't filled it in yet? Complete your{" "}
              <Link to="/app/profile" className="font-semibold text-brand hover:underline">
                Athlete Profile
              </Link>{" "}
              first — the more you answer, the sharper the program.
            </p>
          )}

          {plan && (
            <article className="mt-6 whitespace-pre-wrap rounded-xl border border-hair bg-panel p-6 text-sm leading-relaxed text-gray-200">
              {plan.plan}
            </article>
          )}
        </div>
      )}
    </AppPage>
  );
};

export default CoachingPage;
