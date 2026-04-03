import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { KioskRuntimeShell } from "@/components/kiosk-runtime-shell";

export const metadata: Metadata = {
  title: "FEATNESS Kiosk",
  description:
    "Simulation FEATNESS de borne nutrition sportive avec algo MET partage et sync Supabase.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <KioskRuntimeShell>{children}</KioskRuntimeShell>
      </body>
    </html>
  );
}
