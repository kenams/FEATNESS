import type { CSSProperties } from "react";

type FeatnessLogoProps = {
  size?: number;
  color?: string;
  subtitle?: string;
  align?: "left" | "center";
};

export function FeatnessLogo({
  size = 28,
  color = "#ffffff",
  subtitle,
  align = "center",
}: FeatnessLogoProps) {
  const width = size * 7.8;
  const subtitleAlign = align === "center" ? "center" : "left";

  return (
    <div
      style={{
        display: "grid",
        justifyItems: align === "center" ? "center" : "start",
        gap: subtitle ? 8 : 0,
      }}
    >
      <svg
        width={width}
        height={size + 10}
        viewBox={`0 0 ${width} ${size + 10}`}
        role="img"
        aria-label="FEATNESS"
      >
        <text
          x="50%"
          y={size}
          textAnchor="middle"
          fill={color}
          style={{
            fontFamily:
              "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif",
            fontSize: `${size}px`,
            fontWeight: 700,
            letterSpacing: "0.15em",
          }}
        >
          FEATNESS
        </text>
      </svg>
      {subtitle ? (
        <p
          style={{
            margin: 0,
            color: "#9ca3af",
            fontSize: 14,
            textAlign: subtitleAlign,
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export const sectionTitleStyle: CSSProperties = {
  color: "#f9fafb",
  fontSize: 20,
  fontWeight: 600,
  margin: 0,
};
