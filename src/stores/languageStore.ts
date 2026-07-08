import { create } from "zustand";

export type Language = "zh" | "en";

interface LanguageStore {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
}

function initialLanguage(): Language {
  if (typeof window === "undefined") return "zh";
  const legacyKey = ["mcp", "manager", "language"].join("-");
  return window.localStorage.getItem("mcpm-language") === "en" ||
    window.localStorage.getItem(legacyKey) === "en"
    ? "en"
    : "zh";
}

export const useLanguageStore = create<LanguageStore>((set, get) => ({
  language: initialLanguage(),
  setLanguage: (language) => {
    window.localStorage.setItem("mcpm-language", language);
    set({ language });
  },
  toggleLanguage: () => {
    const next = get().language === "zh" ? "en" : "zh";
    window.localStorage.setItem("mcpm-language", next);
    set({ language: next });
  },
}));
