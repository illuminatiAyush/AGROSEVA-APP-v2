/**
 * Global Language Store
 * Manages app language state with persistence.
 * Supports English (en), Hindi (hi), and Marathi (mr).
 * Default: English (en)
 */

import { create } from 'zustand';
import { storageService } from '@/services/StorageService';
import { STORAGE_KEYS } from '@/utils/constants';

export type Language = 'en' | 'hi' | 'mr';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  loadLanguage: () => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  // Default to English
  language: 'en',

  setLanguage: async (lang: Language) => {
    set({ language: lang });
    // Persist to storage
    await storageService.set(STORAGE_KEYS.LANGUAGE, lang);
  },

  loadLanguage: async () => {
    try {
      const savedLang = await storageService.get<string>(STORAGE_KEYS.LANGUAGE);
      if (savedLang === 'en' || savedLang === 'hi' || savedLang === 'mr') {
        set({ language: savedLang });
      } else {
        // If invalid or no saved language, default to en
        set({ language: 'en' });
        await storageService.set(STORAGE_KEYS.LANGUAGE, 'en');
      }
    } catch (error) {
      console.error('Failed to load language:', error);
      // Default to en on error
      set({ language: 'en' });
    }
  },
}));

