import type { CSSProperties } from "react";

import { FeatnessLogo } from "./featness-logo";

export function KioskOfflineScreen({ kioskId }: { kioskId: string | null }) {
  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <div style={logoWrapStyle}>
          <FeatnessLogo
            size={30}
            subtitle="experience nutrition intelligente"
          />
        </div>
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
          Merci de votre patience. L&apos;equipe FEATNESS intervient et le service
          reviendra tres bientot.
        </p>
        <div style={metaPanelStyle}>
          <p style={statusLabelStyle}>Etat en cours</p>
          <p style={statusValueStyle}>Maintenance ou indisponibilite reseau</p>
          <p style={kioskStyle}>{kioskId ?? "KIOSK-ID-MISSING"}</p>
        </div>
      </section>
    </main>
  );
}

export function KioskOutOfStockScreen({ kioskId }: { kioskId: string | null }) {
  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <div style={logoWrapStyle}>
          <FeatnessLogo
            size={30}
            subtitle="experience nutrition intelligente"
          />
        </div>
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
        <p style={subtitleStyle}>
          Les recettes disponibles ont ete epuisees. Revenez bientot pour votre
          prochain repas FEATNESS.
        </p>
        <div style={metaPanelStyle}>
          <p style={statusLabelStyle}>Etat du distributeur</p>
          <p style={statusValueStyle}>Restock en attente</p>
          <p style={kioskStyle}>{kioskId ?? "KIOSK-ID-MISSING"}</p>
        </div>
      </section>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background:
    "radial-gradient(circle at top, rgba(217,189,100,0.16), transparent 32%), linear-gradient(180deg, #050807 0%, #09100d 100%)",
  color: "#f6f7f8",
  padding: 24,
};

const panelStyle: CSSProperties = {
  width: "min(720px, 100%)",
  textAlign: "center",
  display: "grid",
  gap: 18,
  padding: "40px 34px",
  borderRadius: 32,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(8, 15, 13, 0.78)",
  boxShadow: "0 30px 80px rgba(0, 0, 0, 0.28)",
};

const logoWrapStyle: CSSProperties = {
  display: "grid",
  justifyItems: "center",
};

const iconWrapStyle: CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  display: "grid",
  placeItems: "center",
  margin: "0 auto",
  color: "#f7d989",
  background: "linear-gradient(180deg, rgba(217,189,100,0.16) 0%, rgba(217,189,100,0.06) 100%)",
};

const titleStyle: CSSProperties = {
  fontSize: 44,
  lineHeight: 1.04,
  letterSpacing: "-0.03em",
  margin: 0,
};

const subtitleStyle: CSSProperties = {
  color: "rgba(221,233,228,0.72)",
  fontSize: 16,
  lineHeight: 1.6,
  maxWidth: 520,
  margin: "0 auto",
};

const metaPanelStyle: CSSProperties = {
  width: "min(360px, 100%)",
  margin: "4px auto 0",
  borderRadius: 24,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  padding: "16px 18px",
  display: "grid",
  gap: 4,
};

const statusLabelStyle: CSSProperties = {
  color: "rgba(221,233,228,0.48)",
  fontSize: 11,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  margin: 0,
};

const statusValueStyle: CSSProperties = {
  color: "#f6f7f8",
  fontSize: 16,
  fontWeight: 600,
  margin: 0,
};

const kioskStyle: CSSProperties = {
  color: "#8ea39d",
  fontSize: 12,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  margin: 0,
};
