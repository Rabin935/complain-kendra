import { Text } from "@/src/theme/typography";
import {
  Component,
  type ErrorInfo,
  type ReactNode } from "react";
import { Pressable,
  StyleSheet,
  View,
} from "react-native";
import { colors } from "../constants/colors";
import { useTranslation } from "../i18n/LanguageContext";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function ErrorFallback({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation("shell");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("errorTitle")}</Text>
      <Text style={styles.message}>{t("errorMessage")}</Text>
      <Pressable style={styles.button} onPress={onReset}>
        <Text style={styles.buttonText}>{t("tryAgain")}</Text>
      </Pressable>
    </View>
  );
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return <ErrorFallback onReset={this.reset} />;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    marginTop: 8,
    minHeight: 44,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  buttonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900",
  },
});
