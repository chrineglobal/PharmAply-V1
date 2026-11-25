import React from "react";
import { cn } from "../../lib/utils";

export type PharmAplyLogoVariant = "vertical" | "horizontal" | "symbol" | "wordmark";
export type PharmAplyLogoTone = "color" | "white" | "teal";
export type PharmAplyLogoSize = number | "sm" | "md" | "lg";

const LOGO_SIZE_MAP: Record<"sm" | "md" | "lg", number> = {
  sm: 30,
  md: 38,
  lg: 48,
};

interface PharmAplyLogoProps {
  variant?: PharmAplyLogoVariant;
  tone?: PharmAplyLogoTone;
  showTagline?: boolean;
  size?: PharmAplyLogoSize;
  className?: string;
}

/**
 * Symbole officiel PharmAply (Repère de localisation + croix officinale + loupe + coupe d'Hygie)
 * Respecte strictement les couleurs officielles (#0E7673 & #38B794) et la déclinaison blanche/monochrome.
 */
export function PharmAplySymbol({
  tone = "color",
  size = 40,
  className = "",
}: {
  tone?: PharmAplyLogoTone;
  size?: number;
  className?: string;
}) {
  const isWhite = tone === "white";
  const isTealMono = tone === "teal";

  const leftPinColor = isWhite ? "#FFFFFF" : "#0E7673";
  const rightPinColor = isWhite ? "#FFFFFF" : isTealMono ? "#0E7673" : "#38B794";
  const innerDetailColor = isWhite ? "#0E7673" : "#FFFFFF";
  const loupeColor = isWhite ? "#FFFFFF" : "#0E7673";
  const chaliceColor = isWhite ? "#FFFFFF" : "#0E7673";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 132"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
      aria-label="Symbole PharmAply"
    >
      <defs>
        <clipPath id="pinClip">
          <path d="M60 4C29.07 4 4 29.07 4 60C4 94.5 52.5 123.5 57.8 126.6C59.16 127.4 60.84 127.4 62.2 126.6C67.5 123.5 116 94.5 116 60C116 29.07 90.93 4 60 4Z" />
        </clipPath>
      </defs>

      {/* Pin shape split between Teal #0E7673 and Vert Santé #38B794 */}
      <g clipPath="url(#pinClip)">
        <rect x="0" y="0" width="120" height="132" fill={leftPinColor} />
        <path
          d="M60 0H120V132H55C55 104 72 88 72 64C72 40 58 24 60 0Z"
          fill={rightPinColor}
        />
      </g>

      {/* White Rounded Pharmacy Cross */}
      <rect
        x="45"
        y="19"
        width="30"
        height="76"
        rx="7"
        fill={innerDetailColor}
      />
      <rect
        x="22"
        y="42"
        width="76"
        height="30"
        rx="7"
        fill={innerDetailColor}
      />

      {/* Magnifying Glass Circle */}
      <circle
        cx="58"
        cy="57"
        r="21"
        fill={isWhite ? "#0E7673" : "#FFFFFF"}
        stroke={isWhite ? "#0E7673" : loupeColor}
        strokeWidth="6"
      />
      {isWhite && (
        <circle
          cx="58"
          cy="57"
          r="19"
          fill="#0E7673"
          stroke="#FFFFFF"
          strokeWidth="3.5"
        />
      )}

      {/* Magnifying Glass Handle */}
      <path
        d="M73.5 72.5L90 89"
        stroke={isWhite ? "#0E7673" : loupeColor}
        strokeWidth="9"
        strokeLinecap="round"
      />
      {isWhite && (
        <path
          d="M74.5 73.5L88.5 87.5"
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeLinecap="round"
        />
      )}

      {/* Bowl of Hygieia (Coupe d'Hygie) */}
      <path
        d="M47 52H69C69 58 64.5 62.5 58 62.5C51.5 62.5 47 58 47 52Z"
        fill={chaliceColor}
      />
      <path
        d="M58 62.5V71M52 71.5H64"
        stroke={chaliceColor}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      {/* Serpent */}
      <path
        d="M58 43C54.5 43 52.5 45 53.5 47.5C54.5 50 61.5 50.5 62 53.5C62.5 56 58 58 56 60.5C54.5 62.5 55.5 66 59 67"
        stroke={chaliceColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="59.5" cy="43" r="1.7" fill={chaliceColor} />
    </svg>
  );
}

/**
 * Logo officiel PharmAply conforme à la Charte Graphique v1.0 (Sections 01 à 06).
 */
export function PharmAplyLogo({
  variant = "horizontal",
  tone = "color",
  showTagline = false,
  size = 36,
  className = "",
}: PharmAplyLogoProps) {
  const numericSize = typeof size === "number" ? size : LOGO_SIZE_MAP[size] ?? 36;
  const textColor = tone === "white" ? "text-white" : "text-[#0E7673] dark:text-[#E7F1F1]";
  const taglineColor =
    tone === "white"
      ? "text-white/90"
      : "text-[#0E7673] dark:text-[#88D4BF]";

  // Version verticale officielle : utilise le fichier transparent fourni sur fond clair/color
  if (variant === "vertical") {
    if (tone === "color") {
      return (
        <div className={cn("inline-flex flex-col items-center select-none", className)}>
          <img
            src="/assets/aistudio/logo_pharmaply_trp_426c2760.png"
            alt="PharmAply — Trouvez Commandez Recevez"
            style={{ width: numericSize }}
            className="h-auto object-contain"
          />
        </div>
      );
    }

    return (
      <div className={cn("inline-flex flex-col items-center text-center select-none", className)}>
        <PharmAplySymbol tone={tone} size={Math.round(numericSize * 0.65)} />
        <span
          className={cn("font-bold tracking-tight leading-none mt-2", textColor)}
          style={{ fontSize: Math.max(18, Math.round(numericSize * 0.22)) }}
        >
          PharmAply
        </span>
        {showTagline && (
          <span
            className={cn("font-medium tracking-normal mt-1", taglineColor)}
            style={{ fontSize: Math.max(10, Math.round(numericSize * 0.09)) }}
          >
            Trouvez Commandez Recevez
          </span>
        )}
      </div>
    );
  }

  if (variant === "symbol") {
    return <PharmAplySymbol tone={tone} size={numericSize} className={className} />;
  }

  if (variant === "wordmark") {
    return (
      <div className={cn("inline-flex flex-col select-none", className)}>
        <span
          className={cn("font-bold tracking-tight leading-none", textColor)}
          style={{ fontSize: Math.max(18, Math.round(numericSize * 0.6)) }}
        >
          PharmAply
        </span>
        {showTagline && (
          <span
            className={cn("font-medium leading-tight mt-0.5", taglineColor)}
            style={{ fontSize: Math.max(10, Math.round(numericSize * 0.26)) }}
          >
            Trouvez Commandez Recevez
          </span>
        )}
      </div>
    );
  }

  // Horizontal (en-têtes site & application, espace = 1/2 X)
  return (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <PharmAplySymbol tone={tone} size={numericSize} />
      <div className="flex flex-col leading-none">
        <span
          className={cn("font-bold tracking-tight leading-none", textColor)}
          style={{ fontSize: Math.max(17, Math.round(numericSize * 0.56)) }}
        >
          PharmAply
        </span>
        {showTagline && (
          <span
            className={cn("font-medium leading-tight mt-0.5 whitespace-nowrap", taglineColor)}
            style={{ fontSize: Math.max(10, Math.round(numericSize * 0.24)) }}
          >
            Trouvez Commandez Recevez
          </span>
        )}
      </div>
    </div>
  );
}
