import { Pressable, StyleSheet, Text, View } from "react-native";

import type { KioskRecord } from "../lib/featness-data";
import { mobileShadow, theme } from "../theme";

type KioskSelectionCardProps = {
  kiosks: KioskRecord[];
  selectedKioskId: string | null;
  onSelect: (kioskId: string) => void;
};

function getStatusLabel(kiosk: KioskRecord): { label: string; tone: "danger" | "warning" | "ok" } {
  if (!kiosk.isActive) {
    return { label: "Inactive", tone: "danger" };
  }

  if (kiosk.stockUnits <= 0) {
    return { label: "Rupture", tone: "danger" };
  }

  if (kiosk.stockUnits <= kiosk.stockAlertThreshold) {
    return { label: "Stock limite", tone: "warning" };
  }

  return { label: "Disponible", tone: "ok" };
}

export function KioskSelectionCard({
  kiosks,
  selectedKioskId,
  onSelect,
}: KioskSelectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Borne</Text>
      <Text style={styles.cardTitle}>Choisis la borne FEATNESS devant toi</Text>
      <Text style={styles.helperText}>
        Tu vois tout de suite le menu actuellement servi sur cette borne, puis FEATNESS adapte la recommandation.
      </Text>

      <View style={styles.list}>
        {kiosks.map((kiosk) => {
          const isSelected = kiosk.id === selectedKioskId;
          const status = getStatusLabel(kiosk);

          return (
            <Pressable
              key={kiosk.id}
              style={[
                styles.kioskCard,
                isSelected && styles.kioskCardSelected,
                status.tone === "danger" && styles.kioskCardDanger,
              ]}
              onPress={() => onSelect(kiosk.id)}
            >
              <View style={styles.header}>
                <View style={styles.headerCopy}>
                  <Text style={styles.kioskName}>{kiosk.name}</Text>
                  <Text style={styles.kioskMeta}>
                    {kiosk.locationCity ?? "Salle non renseignee"} · {kiosk.id}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusChip,
                    status.tone === "ok"
                      ? styles.statusChipOk
                      : status.tone === "warning"
                        ? styles.statusChipWarning
                        : styles.statusChipDanger,
                  ]}
                >
                  <Text style={styles.statusChipText}>{status.label}</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Stock</Text>
                  <Text style={styles.statValue}>{kiosk.stockUnits}</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Alerte</Text>
                  <Text style={styles.statValue}>{kiosk.stockAlertThreshold}</Text>
                </View>
              </View>

              <View
                style={[
                  styles.selectButton,
                  isSelected && styles.selectButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    isSelected && styles.selectButtonTextSelected,
                  ]}
                >
                  {isSelected ? "Borne active" : "Voir cette borne"}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
    ...mobileShadow,
  },
  eyebrow: {
    color: theme.colors.gold,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.6,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  kioskCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  kioskCardSelected: {
    borderColor: "rgba(111,212,168,0.28)",
    backgroundColor: theme.colors.mintSoft,
  },
  kioskCardDanger: {
    borderColor: "rgba(240,138,126,0.24)",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  kioskName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  kioskMeta: {
    color: theme.colors.textMuted,
    lineHeight: 19,
  },
  statusChip: {
    alignSelf: "flex-start",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusChipOk: {
    backgroundColor: theme.colors.mintSoft,
    borderColor: "rgba(111,212,168,0.22)",
  },
  statusChipWarning: {
    backgroundColor: theme.colors.goldSoft,
    borderColor: theme.colors.borderStrong,
  },
  statusChipDanger: {
    backgroundColor: "rgba(240,138,126,0.12)",
    borderColor: "rgba(240,138,126,0.22)",
  },
  statusChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  selectButton: {
    borderRadius: theme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  selectButtonSelected: {
    backgroundColor: theme.colors.mint,
    borderColor: theme.colors.mint,
  },
  selectButtonText: {
    color: theme.colors.text,
    fontWeight: "700",
    textAlign: "center",
  },
  selectButtonTextSelected: {
    color: theme.colors.ink,
  },
});
