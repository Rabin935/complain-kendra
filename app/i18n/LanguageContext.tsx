import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { translations, type Language, type TranslationNamespaces } from "./translations";

const LANGUAGE_STORAGE_KEY = "complain-kendra:language";

type TranslationVars = Record<string, string | number>;

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function isLanguage(value: unknown): value is Language {
  return value === "English" || value === "Nepali";
}

function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>("English");

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((stored) => {
        if (isMounted && isLanguage(stored)) {
          setLanguageState(stored);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    void AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ language, setLanguage }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }

  return context;
}

export function useTranslation<N extends keyof TranslationNamespaces>(namespace: N) {
  const { language } = useLanguage();
  const dict = translations[language][namespace] as Record<string, string>;
  const fallbackDict = translations.English[namespace] as Record<string, string>;

  const t = useCallback(
    (key: keyof TranslationNamespaces[N] & string, vars?: TranslationVars): string => {
      const template = dict[key] ?? fallbackDict[key] ?? key;
      return interpolate(template, vars);
    },
    [dict, fallbackDict],
  );

  return { t, language };
}
