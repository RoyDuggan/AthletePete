import React, { useId } from "react";

/**
 * D+R Athletic Development brand mark: a Fredoka "R" with the top half in signal
 * red (reads as the "D") and the lower half in white (the "R"), per the brand
 * guide. Rendered inline so the page's Fredoka web font applies.
 */
export const DRMark: React.FC<{ className?: string; light?: boolean }> = ({
  className = "h-10 w-auto",
  light = false,
}) => {
  const clip = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 175 172" className={className} role="img" aria-label="D+R">
      <defs>
        <clipPath id={clip}>
          <rect x="0" y="0" width="175" height="85" />
        </clipPath>
      </defs>
      <text
        x="87.5"
        y="158"
        textAnchor="middle"
        fontFamily="Fredoka, sans-serif"
        fontWeight={700}
        fontSize={210}
        fill={light ? "#14181F" : "#EDEFF2"}
      >
        R
      </text>
      <text
        x="87.5"
        y="158"
        textAnchor="middle"
        fontFamily="Fredoka, sans-serif"
        fontWeight={700}
        fontSize={210}
        fill="#FF3B2E"
        clipPath={`url(#${clip})`}
      >
        R
      </text>
    </svg>
  );
};

/** Horizontal lockup: the mark + "D+R" wordmark + "Athletic Development". */
export const DRWordmark: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <DRMark className="h-9 w-auto lg:h-10" />
    <div className="leading-none">
      <div className="font-display text-2xl font-bold leading-none text-white">
        D<span className="text-brand">+</span>R
      </div>
      <div className="mt-1 font-oswald text-[9px] font-semibold uppercase tracking-[0.24em] text-muted">
        Athletic Development
      </div>
    </div>
  </div>
);

export default DRWordmark;
