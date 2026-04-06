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
  const justify = align === "center" ? "center" : "start";
  const textX = align === "center" ? "50%" : "0";
  const anchor = align === "center" ? "middle" : "start";

  return (
    <div
      style={{
        display: "grid",
        justifyItems: justify,
        gap: subtitle ? 8 : 0,
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 6,
          justifyItems: justify,
        }}
      >
        <div
          style={{
            width: align === "center" ? Math.max(size * 1.8, 48) : Math.max(size * 1.4, 42),
            height: 3,
            borderRadius: 999,
            background: "linear-gradient(90deg, rgba(247,217,137,0.1) 0%, #d9bd64 50%, rgba(247,217,137,0.1) 100%)",
          }}
        />
        <svg
          width={width}
          height={size + 14}
          viewBox={`0 0 ${width} ${size + 14}`}
          role="img"
          aria-label="FEATNESS"
        >
          <text
            x={textX}
            y={size}
            textAnchor={anchor}
            fill={color}
            style={{
              fontFamily:
                "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif",
              fontSize: `${size}px`,
              fontWeight: 700,
              letterSpacing: "0.18em",
            }}
          >
            FEATNESS
          </text>
        </svg>
      </div>
      {subtitle ? (
        <p
          style={{
            margin: 0,
            color: "rgba(243,247,245,0.68)",
            fontSize: 13,
            letterSpacing: "0.06em",
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
  letterSpacing: "-0.01em",
  margin: 0,
};
