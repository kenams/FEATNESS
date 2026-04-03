import type { CSSProperties } from "react";

export function KioskOfflineScreen({ kioskId }: { kioskId: string | null }) {
  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <p style={eyebrowStyle}>FEATNESS</p>
        <div style={iconWrapStyle}>
          <svg
            viewBox="0 0 24 24"
            width="36"
            height="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.3 3.84 1.82 18A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.7 3.84a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>
        <h1 style={titleStyle}>Borne temporairement indisponible</h1>
        <p style={subtitleStyle}>
          Merci de votre patience. Nous revenons tres bientot.
        </p>
        <p style={kioskStyle}>{kioskId ?? "KIOSK-ID-MISSING"}</p>
      </section>
    </main>
  );
}

export function KioskOutOfStockScreen({ kioskId }: { kioskId: string | null }) {
  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <p style={eyebrowStyle}>FEATNESS</p>
        <div style={iconWrapStyle}>
          <svg
            viewBox="0 0 24 24"
            width="36"
            height="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path d="M6 7h12" />
            <path d="M8 11h8" />
            <path d="M10 15h4" />
            <path d="M7 3h10a2 2 0 0 1 2 2v14H5V5a2 2 0 0 1 2-2Z" />
          </svg>
        </div>
        <h1 style={titleStyle}>Borne en rupture de stock</h1>
        <p style={subtitleStyle}>Revenez bientot pour votre prochain repas FEATNESS.</p>
        <p style={kioskStyle}>{kioskId ?? "KIOSK-ID-MISSING"}</p>
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#050807",
  color: "#f6f7f8",
  padding: 24,
};

const panelStyle: CSSProperties = {
  width: "min(720px, 100%)",
  textAlign: "center",
  display: "grid",
  gap: 16,
};

const eyebrowStyle: CSSProperties = {
  color: "#c9a646",
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  fontSize: 12,
  margin: 0,
};

const iconWrapStyle: CSSProperties = {
  width: 88,
  height: 88,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  display: "grid",
  placeItems: "center",
  margin: "0 auto",
  color: "#f7d989",
  background: "rgba(201,166,70,0.08)",
};

const titleStyle: CSSProperties = {
  fontSize: 42,
  lineHeight: 1.05,
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  color: "#9eb6af",
  fontSize: 16,
  margin: 0,
};

const kioskStyle: CSSProperties = {
  color: "#6f8a83",
  fontSize: 12,
  letterSpacing: "0.08em",
  margin: 0,
};
