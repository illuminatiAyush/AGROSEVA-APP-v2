/**
 * Global Translation Helper
 * Provides translation function that reads from global language store.
 * Usage: import { useTranslation } from '@/utils/i18n';
 *        const t = useTranslation();
 *        <Text>{t('greeting')}</Text>
 *        <Text>{t('skippedIrrigationMsg', { day: 'Friday', amount: 450 })}</Text>
 */

import { translations } from './translations';
import { useLanguageStore } from '@/store/useLanguageStore';

type TranslationKey = keyof typeof translations.en;
type LanguageKeys = keyof typeof translations;

/**
 * Helper to replace variables in a string
 */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  let result = text;
  Object.keys(params).forEach(key => {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(params[key]));
  });
  return result;
}

/**
 * Hook version for React components
 * Automatically re-renders when language changes
 * This is the PRIMARY way to use translations in components
 */
export function useTranslation() {
  const language = useLanguageStore((state) => state.language);

  return (key: TranslationKey, params?: Record<string, string | number>): string => {
    // Try current language first
    const langTranslations = translations[(language as LanguageKeys) || 'en'] as Partial<Record<TranslationKey, string>>;
    const translation = langTranslations?.[key];
    if (translation) return interpolate(translation, params);

    // Fallback to English if missing
    const englishFallback = (translations.en as Record<TranslationKey, string>)?.[key];
    if (englishFallback) return interpolate(englishFallback, params);

    // Final fallback: return key
    return key;
  };
}

/**
 * Non-hook version for use outside React components
 * Does NOT trigger re-renders - use sparingly
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const language = useLanguageStore.getState().language;

  // Try current language first
  const langTranslations = translations[language] as Partial<Record<TranslationKey, string>>;
  const translation = langTranslations?.[key];
  if (translation) return interpolate(translation, params);

  // Fallback to English if missing
  const englishFallback = translations.en?.[key];
  if (englishFallback) return interpolate(englishFallback, params);

  // Final fallback: return key
  return key;
}

