import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { authInput, authLabel, authError, focusRing } from "../components/marketing/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HERO_BG: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(90deg, rgba(8,12,17,.96) 0%, rgba(8,12,17,.82) 45%, rgba(8,12,17,.45) 78%), url('/assets/brand/hero-athlete-1600x900.webp')",
  backgroundSize: "cover",
  backgroundPosition: "center",
};

/**
 * Split-screen home: DR Performance marketing (left, over the athlete hero) and
 * account registration (right). The whole home page is the sign-up funnel.
 */
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    agree: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const e: Record<string, string> = {};
    if (!EMAIL_RE.test(form.email)) e.email = "Enter a valid email address.";
    if (form.password.length < 8) e.password = "Use at least 8 characters.";
    if (!form.agree) e.agree = "Please accept the terms to continue.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      await register(form.email, form.password, form.name || undefined);
      navigate("/app/dashboard");
    } catch (err) {
      setErrors({ email: err instanceof Error ? err.message : "Registration failed." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-ink lg:grid-cols-2">
      {/* ---- Left: marketing over the athlete hero ---- */}
      <div
        className="relative flex flex-col justify-between px-8 py-10 md:px-14 lg:min-h-screen"
        style={HERO_BG}
      >
        <img
          src="/assets/brand/dr-performance-logo-dark.svg"
          alt="DR Performance — Athlete Training and Development"
          className="h-12 w-auto md:h-14"
        />

        <div className="max-w-lg py-10 lg:py-0">
          <p className="text-sm font-bold uppercase tracking-widest text-hero-blue">
            Individualised training. Measurable progress.
          </p>
          <h1 className="mt-4 text-4xl font-extrabold uppercase leading-tight tracking-wide text-white md:text-6xl">
            Better athletes.{" "}
            <span className="text-hero-blue">Stronger futures.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-gray-300">
            Science-led coaching for athletes who want to perform at their best.
            Get an individualised, AI-built training plan — reviewed by a
            professional coach — and follow it week by week.
          </p>

          <ul className="mt-7 space-y-2 text-sm text-gray-300">
            {[
              "Personalised plan from a short questionnaire",
              "Coach-curated and adapted every week",
              "Built around your sport, level and goals",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span className="text-hero-blue">▸</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-gray-500">
          © DR Performance — Athlete Training and Development
        </p>
      </div>

      {/* ---- Right: register ---- */}
      <div className="flex items-center justify-center px-6 py-12 md:px-12">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-extrabold uppercase tracking-wide text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Start your training programme in minutes.
          </p>

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
            <div>
              <label className={authLabel} htmlFor="name">
                Full name{" "}
                <span className="font-normal text-[#9ca3af]">(optional)</span>
              </label>
              <input
                id="name"
                className={authInput}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Your name"
              />
            </div>

            <div>
              <label className={authLabel} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={authInput}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email && <p className={authError}>{errors.email}</p>}
            </div>

            <div>
              <label className={authLabel} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={authInput}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="At least 8 characters"
                aria-invalid={Boolean(errors.password)}
              />
              {errors.password && <p className={authError}>{errors.password}</p>}
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(e) => set("agree", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand"
              />
              <span>
                I agree to the{" "}
                <Link to="/terms" className="font-semibold text-hero-blue hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="font-semibold text-hero-blue hover:underline">
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {errors.agree && <p className={authError}>{errors.agree}</p>}

            <button
              type="submit"
              disabled={submitting}
              className={`flex h-12 w-full items-center justify-center rounded-3xl bg-brand text-sm font-bold uppercase tracking-wide text-white transition duration-300 hover:-translate-y-0.5 hover:bg-hero-blue disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
            >
              {submitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link to="/sign-in" className="font-semibold text-hero-blue hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
