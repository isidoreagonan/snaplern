import { Link } from "@tanstack/react-router";

type LogoProps = {
  variant?: "full" | "compact" | "icon";
  className?: string;
  /** Optional: wrap in a Link to "/" */
  asLink?: boolean;
  onClick?: () => void;
  /** Show "STUDIO" tagline (full variant only) */
  showTagline?: boolean;
};

/**
 * SnapLern brand logo — SVG, single source of truth.
 * - `full`: icon + "SnapLern" wordmark (+ optional STUDIO tagline)
 * - `compact`: icon + "SnapLern" wordmark, tighter, for navbars
 * - `icon`: icon only
 */
export function Logo({
  variant = "compact",
  className = "",
  asLink = false,
  onClick,
  showTagline = false,
}: LogoProps) {
  const svg = (
    <LogoSVG variant={variant} showTagline={showTagline} className={className} />
  );
  if (asLink) {
    return (
      <Link to="/" onClick={onClick} aria-label="SnapLern" className="inline-flex items-center shrink-0">
        {svg}
      </Link>
    );
  }
  return svg;
}

function LogoSVG({
  variant,
  showTagline,
  className,
}: {
  variant: "full" | "compact" | "icon";
  showTagline: boolean;
  className: string;
}) {
  // Unique IDs to avoid collisions when multiple logos render on the same page
  const uid = useId();
  const iconGrad = `iconGrad-${uid}`;
  const sparkGrad = `sparkGrad-${uid}`;
  const softShadow = `softShadow-${uid}`;

  const defs = (
    <defs>
      <linearGradient id={iconGrad} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF5F3B" />
        <stop offset="100%" stopColor="#FF8C5A" />
      </linearGradient>
      <linearGradient id={sparkGrad} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFB347" />
        <stop offset="100%" stopColor="#FF6B35" />
      </linearGradient>
      <filter id={softShadow} x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#FF5F3B" floodOpacity="0.25" />
      </filter>
    </defs>
  );

  const iconGroup = (
    <g>
      <rect x="4" y="10" width="96" height="96" rx="22" ry="22" fill={`url(#${iconGrad})`} filter={`url(#${softShadow})`} />
      <rect x="22" y="38" width="60" height="38" rx="8" ry="8" fill="none" stroke="white" strokeWidth="3.5" />
      <circle cx="52" cy="57" r="13" fill="none" stroke="white" strokeWidth="3.5" />
      <circle cx="52" cy="57" r="6.5" fill="white" opacity="0.95" />
      <rect x="38" y="31" width="18" height="10" rx="4" ry="4" fill="none" stroke="white" strokeWidth="3.2" />
      <polygon points="71,26 68,36 73,34 69,46 76,33 70,35" fill={`url(#${sparkGrad})`} opacity="0.9" />
    </g>
  );

  if (variant === "icon") {
    return (
      <svg viewBox="0 0 110 116" className={className || "h-9 w-9"} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SnapLern">
        {defs}
        {iconGroup}
      </svg>
    );
  }

  const wordmark = (
    <>
      <text
        x="116"
        y="72"
        fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
        fontSize="46"
        fontWeight="800"
        fill={`url(#${iconGrad})`}
        letterSpacing="-1"
      >
        Snap
      </text>
      <text
        x="213"
        y="72"
        fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
        fontSize="46"
        fontWeight="400"
        fill="#2D2D3A"
        letterSpacing="-1"
      >
        Lern
      </text>
      <g transform="translate(358, 22)">
        <polygon points="0,-9 2,-2 9,0 2,2 0,9 -2,2 -9,0 -2,-2" fill="#FF8C5A" opacity="0.85" />
      </g>
      <g transform="translate(380, 36)">
        <polygon points="0,-5 1.5,-1.5 5,0 1.5,1.5 0,5 -1.5,1.5 -5,0 -1.5,-1.5" fill="#FFB347" opacity="0.7" />
      </g>
      {showTagline && (
        <text
          x="116"
          y="94"
          fontFamily="'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
          fontSize="13"
          fontWeight="400"
          fill="#FF7A50"
          letterSpacing="3.5"
          opacity="0.85"
        >
          STUDIO
        </text>
      )}
    </>
  );

  // Tighter viewBox for compact (drops the STUDIO row)
  const viewBox = variant === "full" ? "0 0 400 120" : "0 0 400 100";
  const sizeClass = className || (variant === "full" ? "h-12 w-auto" : "h-9 w-auto");

  return (
    <svg viewBox={viewBox} className={sizeClass} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="SnapLern">
      {defs}
      {iconGroup}
      {wordmark}
    </svg>
  );
}

// Local useId import kept at bottom to avoid React import duplication elsewhere
import { useId } from "react";