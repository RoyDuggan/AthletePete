import React, { useId } from "react";

/**
 * DR Performance brand mark: the sponsor's "DR" monogram (from the supplied
 * brand assets) — a dark "D" beside a blue "R". Rendered inline as SVG so it
 * scales crisply and supports the light / mono variants the headers need.
 */
export const DRMark: React.FC<{
  className?: string;
  /** Dark "D" for use on a light background. */
  light?: boolean;
  /** Single-colour (white) mark, for use on a coloured/blue banner. */
  mono?: boolean;
}> = ({ className = "h-10 w-auto", light = false, mono = false }) => {
  const gid = useId().replace(/:/g, "");
  const dFill = mono ? "#FFFFFF" : light ? "#11151A" : "#EDEFF2";
  const rFill = mono ? "#FFFFFF" : `url(#${gid})`;
  return (
    <svg
      viewBox="0 0 320 220"
      className={className}
      role="img"
      aria-label="DR Performance"
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="1">
          <stop offset="0" stopColor="#32A8FF" />
          <stop offset="1" stopColor="#0866C6" />
        </linearGradient>
      </defs>
      {/* D */}
      <path
        d="M10 28h96c58 0 91 30 91 68s-33 68-91 68H10V28zm44 38v60h50c29 0 47-11 47-30s-18-30-47-30H54z"
        fill={dFill}
      />
      {/* R */}
      <path
        d="M120 28h92c51 0 81 24 81 62 0 27-15 47-43 57l58 47h-65l-51-42h-28v42h-44V28zm44 37v51h45c26 0 40-9 40-26s-14-25-40-25h-45z"
        fill={rFill}
      />
    </svg>
  );
};

/**
 * Horizontal lockup: the DR mark + "Performance" wordmark, reading "DR
 * Performance". Pass `inverse` on a blue / coloured banner (white mark + text).
 */
export const DRWordmark: React.FC<{ className?: string; inverse?: boolean }> = ({
  className = "",
  inverse = false,
}) => (
  <div className={`flex items-center gap-2.5 ${className}`}>
    <DRMark className="h-8 w-auto lg:h-9" mono={inverse} />
    <span className="font-display text-lg font-extrabold uppercase tracking-[0.2em] text-white lg:text-xl">
      Performance
    </span>
  </div>
);

export default DRWordmark;
