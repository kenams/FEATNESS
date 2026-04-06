import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { theme } from "../../theme";

type ToastType = "success" | "error" | "info";

type ToastState = {
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const translateY = useRef(new Animated.Value(96)).current;

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      setToast({ message, type });
      translateY.setValue(96);

      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
        Animated.timing(translateY, {
          toValue: 96,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToast(null);
      });
    },
    [translateY],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            { transform: [{ translateY }] },
          ]}
        >
          <View
            style={[
              styles.toast,
              toast.type === "success"
                ? styles.toastSuccess
                : toast.type === "error"
                  ? styles.toastError
                  : styles.toastInfo,
            ]}
          >
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 112,
  },
  toast: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  toastSuccess: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  toastError: {
    backgroundColor: theme.colors.error,
    borderColor: theme.colors.error,
  },
  toastInfo: {
    backgroundColor: theme.colors.surfaceLight,
    borderColor: theme.colors.border,
  },
  toastText: {
    color: theme.colors.text,
    fontWeight: "700",
    textAlign: "center",
  },
});
