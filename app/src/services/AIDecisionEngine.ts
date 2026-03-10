// src/services/AIDecisionEngine.ts
import { useStore } from '@/store/useStore';
import { t } from '@/utils/i18n';

export interface AIRecommendation {
  action: 'IRRIGATE' | 'FERTILIZE' | 'WAIT' | 'SAFE';
  confidence: number; // 0-100%
  reason: string;
  details: string;
}

export const AIDecisionEngine = {
  analyze: (): AIRecommendation => {
    const { soilData, weather } = useStore.getState();
    const { moisture, nitrogen, phosphorus, potassium } = soilData;

    // 1. Check Weather (Smart Water Saving)
    const rainComing = weather.forecast.some((d, index) => index < 2 && d.condition === 'Rainy');

    // RULE 1: SMART WAIT (Moisture low, but rain is coming)
    if (moisture < 40 && rainComing) {
      return {
        action: 'WAIT',
        confidence: 92,
        reason: t('rainSoon'),
        details: t('rainSoonDesc'),
      };
    }

    // RULE 2: IRRIGATION NEEDED (Dry and no rain)
    if (moisture < 35) {
      return {
        action: 'IRRIGATE',
        confidence: 98,
        reason: t('critical'),
        details: t('criticalDesc', { moisture: moisture.toFixed(1) }),
      };
    }

    // RULE 3: FERTILIZER (NPK check)
    if (nitrogen < 120 || phosphorus < 30 || potassium < 150) {
      return {
        action: 'FERTILIZE',
        confidence: 85,
        reason: t('nutrientDef'),
        details: t('nutrientDesc'),
      };
    }

    // RULE 4: ALL GOOD
    return {
      action: 'SAFE',
      confidence: 100,
      reason: t('optimal'),
      details: t('optimalDesc'),
    };
  }
};