import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { type DispenseTokenRecord, type WorkoutSessionRecord } from "@featness/shared";

import { mobileShadow, theme } from "../theme";

type ActiveTokenCardProps = {
  token: DispenseTokenRecord | null;
  session: WorkoutSessionRecord | null;
  mealName: string | null;
  canGenerate: boolean;
  onGenerate: () => void;
  onClearMeal: () => void;
  onChangeSession: () => void;
  isBusy: boolean;
};

function formatRemaining(expiresAt: string, nowMs = Date.now()): string {
  if (new Date(expiresAt).getTime() <= nowMs) {
    return "Expire";
  }

  const minutes = Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - nowMs) / 60_000),
  );

  return `${minutes} min restantes`;
}

export function ActiveTokenCard({
  token,
  session,
  mealName,
  canGenerate,
  onGenerate,
  onClearMeal,
  onChangeSession,
  isBusy,
}: ActiveTokenCardProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [now, setNow] = useState(Date.now());
  const nextStepCopy = token
    ? "Presente ce QR directement a la borne FEATNESS pour recuperer ton plat."
    : canGenerate
      ? "Ton plat est valide. Genere maintenant le QR pour le presenter a la borne."
      : "Choisis d'abord ton plat pour debloquer le QR.";

  useEffect(() => {
    if (!token) {
      return;
    }

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!token) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      pulse.stopAnimation();
      pulse.setValue(0);
    };
  }, [pulse, token]);

  const remainingLabel = token ? formatRemaining(token.expiresAt, now) : null;
  const isExpiredToken = token ? new Date(token.expiresAt).getTime() <= now : false;

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0],
  });

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Qr</Text>
      <Text style={styles.cardTitle}>Presente ce QR a la borne</Text>
      <Text style={styles.helperText}>
        Une seule action attendue ici : ouvrir le QR et le montrer a la borne FEATNESS.
      </Text>
      <View style={styles.callout}>
        <Text style={styles.calloutEyebrow}>Action</Text>
        <Text style={styles.calloutText}>{nextStepCopy}</Text>
      </View>

      {token ? (
        <View style={styles.tokenBlock}>
          <View style={styles.readyBanner}>
            <Text style={styles.readyBannerLabel}>
              {isExpiredToken ? "QR a regenerer" : "Pret a scanner"}
            </Text>
            <Text style={styles.readyBannerValue}>
              {remainingLabel ?? formatRemaining(token.expiresAt)}
            </Text>
          </View>
          {mealName ? (
            <View style={styles.mealPill}>
              <Text style={styles.mealPillLabel}>Plat</Text>
              <Text style={styles.mealPillValue}>{mealName}</Text>
            </View>
          ) : null}
          <View style={styles.qrStage}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.qrPulse,
                {
                  opacity: pulseOpacity,
                  transform: [{ scale: pulseScale }],
                },
              ]}
            />
            <View style={styles.qrWrap}>
              <QRCode value={token.id} size={220} />
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={[styles.statusChip, styles.statusChipActive]}>
              <Text style={styles.statusChipText}>Token {token.status}</Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>
                {session ? `${session.workout.durationMin} min / ${session.workout.goal}` : "Session active"}
              </Text>
            </View>
          </View>
          <Text style={styles.scanInstruction}>Approche ton telephone du lecteur QR de la borne.</Text>
          {session ? (
            <Text style={styles.meta}>
              Seance : {session.workout.sport} / {session.preparationStatus}
            </Text>
          ) : null}
          <Pressable
            style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
            onPress={onClearMeal}
            disabled={isBusy}
          >
            <Text style={styles.secondaryButtonText}>Changer de plat</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
            onPress={onChangeSession}
            disabled={isBusy}
          >
            <Text style={styles.secondaryButtonText}>Changer de seance</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={onGenerate} disabled={isBusy}>
            <Text style={styles.secondaryButtonText}>
              {isBusy ? "Regeneration..." : "Regenerer le QR"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Pressable
            style={[
              styles.primaryButton,
              (isBusy || !canGenerate) && styles.buttonDisabled,
            ]}
            onPress={onGenerate}
            disabled={isBusy || !canGenerate}
          >
            <Text style={styles.primaryButtonText}>
              {isBusy
                ? "Generation..."
                : canGenerate
                  ? "Generer mon QR"
                  : "Choisis d'abord ton plat"}
            </Text>
          </Pressable>
          <Text style={styles.emptyText}>
            {canGenerate
              ? "Ton plat est valide. Genere le QR et montre-le a la borne."
              : "Valide d'abord ton plat pour debloquer le QR."}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderStrong,
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
  callout: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: theme.colors.mintSoft,
    borderWidth: 1,
    borderColor: "rgba(111,212,168,0.2)",
    gap: 4,
  },
  calloutEyebrow: {
    color: theme.colors.mint,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  calloutText: {
    color: theme.colors.textSoft,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: theme.colors.gold,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: theme.colors.ink,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  tokenBlock: {
    backgroundColor: "#08110f",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(201,166,70,0.18)",
  },
  readyBanner: {
    width: "100%",
    borderRadius: 20,
    padding: 14,
    backgroundColor: theme.colors.goldSoft,
    borderWidth: 1,
    borderColor: "rgba(201,166,70,0.24)",
    alignItems: "center",
    gap: 4,
  },
  readyBannerLabel: {
    color: "#f1d893",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    fontWeight: "700",
  },
  readyBannerValue: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  mealPill: {
    width: "100%",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4,
  },
  mealPillLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  mealPillValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  qrStage: {
    width: 286,
    height: 286,
    alignItems: "center",
    justifyContent: "center",
  },
  qrPulse: {
    position: "absolute",
    width: 278,
    height: 278,
    borderRadius: 999,
    backgroundColor: theme.colors.goldSoft,
    borderWidth: 1,
    borderColor: "rgba(201,166,70,0.18)",
  },
  qrWrap: {
    backgroundColor: theme.colors.white,
    padding: 18,
    borderRadius: 24,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  statusChip: {
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipActive: {
    backgroundColor: theme.colors.gold,
    borderColor: theme.colors.gold,
  },
  statusChipText: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  scanInstruction: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  secondaryButton: {
    width: "100%",
    borderRadius: theme.radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
