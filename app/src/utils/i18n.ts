/**
 * Global Translation Helper
 * Provides translation function that reads from global language store.
 * Usage: import { useTranslation } from '@/utils/i18n';
 *        const t = useTranslation();
 *        <Text>{t('greeting')}</Text>
 */

import { translations } from './translations';
import { useLanguageStore } from '@/store/useLanguageStore';

type TranslationKey = keyof typeof translations.en;

/**
 * Hook version for React components
 * Automatically re-renders when language changes
 * This is the PRIMARY way to use translations in components
 */
export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  
  return (key: TranslationKey): string => {
    // Try current language first
    const translation = translations[language]?.[key];
    if (translation) return translation;
    
    // Fallback to English if missing
    const englishFallback = translations.en?.[key];
    if (englishFallback) return englishFallback;
    
    // Final fallback: return key
    return key;
  };
}

/**
 * Non-hook version for use outside React components
 * Does NOT trigger re-renders - use sparingly
 */
export function t(key: TranslationKey): string {
  const language = useLanguageStore.getState().language;
  
  // Try current language first
  const translation = translations[language]?.[key];
  if (translation) return translation;
  
  // Fallback to English if missing
  const englishFallback = translations.en?.[key];
  if (englishFallback) return englishFallback;
  
  // Final fallback: return key
  return key;
}

