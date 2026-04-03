import { Pressable, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { isExpired, type DispenseTokenRecord, type WorkoutSessionRecord } from "@featness/shared";

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
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>QR FEATNESS</Text>
      <Text style={styles.helperText}>
        Le QR code reste valide 30 minutes. La borne valide l'UUID, le statut
        et l'expiration avant preparation.
      </Text>

      <Pressable
        style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
        onPress={onGenerate}
        disabled={isBusy}
      >
        <Text style={styles.primaryButtonText}>
          {isBusy ? "Generation..." : "Generer un QR code"}
        </Text>
      </Pressable>

      {token ? (
        <View style={styles.tokenBlock}>
          <View style={styles.qrWrap}>
            <QRCode value={token.id} size={168} />
          </View>
          <Text style={styles.tokenId}>{token.id}</Text>
          <Text style={styles.meta}>Statut token : {token.status}</Text>
          <Text style={styles.meta}>Validite : {formatRemaining(token)}</Text>
          {session ? (
            <Text style={styles.meta}>
              Seance : {session.workout.sport} / {session.preparationStatus}
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          Aucun QR actif. Genere une seance pour lancer la distribution borne.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#10201d",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  cardTitle: {
    color: "#f6f7f8",
    fontSize: 20,
    fontWeight: "700",
  },
  helperText: {
    color: "#88a099",
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: "#c9a646",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#08110f",
    fontWeight: "700",
    textAlign: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  tokenBlock: {
    backgroundColor: "#0c1816",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  qrWrap: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 16,
  },
  tokenId: {
    color: "#f6f7f8",
    fontSize: 12,
    textAlign: "center",
  },
  meta: {
    color: "#88a099",
    fontSize: 13,
  },
  emptyText: {
    color: "#88a099",
    lineHeight: 20,
  },
});
