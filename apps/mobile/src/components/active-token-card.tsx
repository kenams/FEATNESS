import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { isExpired, type DispenseTokenRecord, type WorkoutSessionRecord } from "@featness/shared";

import { mobileShadow, theme } from "../theme";

type ActiveTokenCardProps = {
  token: DispenseTokenRecord | null;
  session: WorkoutSessionRecord | null;
  onGenerate: () => void;
  isBusy: boolean;
};

function formatRemaining(token: DispenseTokenRecord): string {
  if (isExpired(token.expiresAt)) {
    return "Expire";
  }

  const minutes = Math.max(
    0,
    Math.ceil((new Date(token.expiresAt).getTime() - Date.now()) / 60_000),
  );

  return `${minutes} min restantes`;
}

export function ActiveTokenCard({
  token,
  session,
  onGenerate,
  isBusy,
}: ActiveTokenCardProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const nextStepCopy = token
    ? "Ton QR est pret. Tu peux maintenant passer a la borne avec ton repas deja choisi."
    : session?.selectedMealBlendId
      ? "Ton plat est valide. Genere maintenant le QR en un clic si tu veux finaliser sur la borne."
      : "Choisis d'abord ton plat. Le QR ne vient qu'apres, pour garder un parcours simple.";
  const canGenerate = Boolean(session?.selectedMealBlendId);

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
      <Text style={styles.cardTitle}>QR FEATNESS</Text>
      <Text style={styles.helperText}>
        Le QR code reste valide 30 minutes. La borne valide l'UUID, le statut et
        l'expiration avant preparation.
      </Text>
      <View style={styles.callout}>
        <Text style={styles.calloutEyebrow}>Etape suivante</Text>
        <Text style={styles.calloutText}>{nextStepCopy}</Text>
      </View>

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

      {token ? (
        <View style={styles.tokenBlock}>
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
              <QRCode value={token.id} size={168} />
            </View>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>Token {token.status}</Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>{formatRemaining(token)}</Text>
            </View>
          </View>
          <Text style={styles.tokenId}>{token.id}</Text>
          {session ? (
            <Text style={styles.meta}>
              Seance : {session.workout.sport} / {session.preparationStatus}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          Aucun QR actif. Valide d'abord ton plat, puis genere le QR seulement si tu en as besoin.
        </Text>
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
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 22,
    padding: 18,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  qrStage: {
    width: 216,
    height: 216,
    alignItems: "center",
    justifyContent: "center",
  },
  qrPulse: {
    position: "absolute",
    width: 212,
    height: 212,
    borderRadius: 999,
    backgroundColor: theme.colors.goldSoft,
    borderWidth: 1,
    borderColor: "rgba(201,166,70,0.18)",
  },
  qrWrap: {
    backgroundColor: theme.colors.white,
    padding: 14,
    borderRadius: 20,
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
  statusChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  tokenId: {
    color: theme.colors.text,
    fontSize: 12,
    textAlign: "center",
  },
  meta: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  emptyText: {
    color: theme.colors.textMuted,
    lineHeight: 20,
  },
});
