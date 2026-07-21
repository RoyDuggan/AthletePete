import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { AppPage } from "../../components/app/AppPage";
import { getTrainingPlan, type TrainingPlan } from "../../api/trainingPlan";

/**
 * The athlete's view of their program. The coach generates and reviews it; the
 * athlete sees status until it's curated, then the finished program. They never
 * see the raw, unreviewed AI draft.
 */
const CoachingPage: React.FC = () => {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrainingPlan()
      .then(setPlan)
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, []);

  const reviewed = plan && (plan.status === "curated" || plan.status === "active");

  return (
    <AppPage
      title="My"
      accent="Program"
      subtitle="Your personalised off-season program, built and reviewed by your coach from your athlete profile."
    >
      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="mx-auto max-w-3xl">
          {!plan && (
            <div className="rounded-xl border border-hair bg-panel p-6">
              <h3 className="font-oswald text-base font-bold uppercase tracking-wide text-white">
                Your profile is with your coach
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-300">
                Once you've completed your{" "}
                <Link to="/app/profile" className="font-semibold text-brand hover:underline">
                  Athlete Profile
                </Link>
                , your coach builds and reviews your program from it. It'll appear
                here as soon as it's ready — check back soon.
              </p>
            </div>
          )}

          {plan && !reviewed && (
            <div className="rounded-xl border border-brand/30 bg-brand/5 p-6">
              <h3 className="font-oswald text-base font-bold uppercase tracking-wide text-white">
                Your program is being prepared
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-300">
                Your coach is reviewing your program. You'll see the final version
                here once it's been checked and approved.
              </p>
            </div>
          )}

          {reviewed && plan && (
            <>
              <p className="mb-4 text-xs text-muted">
                Reviewed by your coach ✓ · updated{" "}
                {new Date(plan.updatedAt).toLocaleDateString()}
              </p>
              <article className="whitespace-pre-wrap rounded-xl border border-hair bg-panel p-6 text-sm leading-relaxed text-gray-200">
                {plan.plan}
              </article>
            </>
          )}
        </div>
      )}
    </AppPage>
  );
};

export default CoachingPage;
