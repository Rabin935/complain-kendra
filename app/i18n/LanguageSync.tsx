import { useEffect } from "react";
import { useAuth } from "../features/auth/context/AuthContext";
import { fetchCitizenProfile } from "../features/user/services/citizen.service";
import { useLanguage } from "./LanguageContext";

export default function LanguageSync() {
  const { token, user } = useAuth();
  const { language, setLanguage } = useLanguage();

  useEffect(() => {
    if (!token || user?.role !== "citizen") {
      return;
    }

    let cancelled = false;

    void fetchCitizenProfile().then((result) => {
      if (cancelled || result.source !== "api" || !result.data.id) {
        return;
      }

      if (result.data.language !== language) {
        setLanguage(result.data.language);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [language, setLanguage, token, user?.role]);

  return null;
}
