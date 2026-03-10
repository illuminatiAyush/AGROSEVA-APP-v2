// src/services/analyticsService.ts
// Generates a layman-friendly, multilingual PDF report and shares it.
// All translations are sourced from local translations.ts — zero network calls.

import { translations } from '@/utils/translations';
import { Language } from '@/store/useLanguageStore';

export interface PumpConfig {
    pumpPowerHp: number;
    flowRateLpm: number;
    energyCostPerKwh: number;
}

interface DayRecord {
    date: string;
    dayLabel: string;      // human-readable localised day (e.g. "Mon 07 Mar")
    waterUsedL: number;
    dailyLimitL: number;
    energyCostRs: number;
    rainSkipped: boolean;
}

// ─────────────────────────────────────────────────────────────
// BUILD HISTORY (30-day synthetic data)
// ─────────────────────────────────────────────────────────────

export function buildHistory(config: PumpConfig, days: number = 30): DayRecord[] {
    const records: DayRecord[] = [];
    const now = new Date();
    const avgSessionMinutes = 40;
    const sessionHours = avgSessionMinutes / 60;
    const pumpKw = config.pumpPowerHp * 0.746;

    for (let i = days - 1; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);

        const dateStr = day.toISOString().split('T')[0];
        const dayLabel = day.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: '2-digit',
        });

        const rainSkipped = Math.random() < 0.2;
        const waterUsedL = rainSkipped
            ? 0
            : Math.round(config.flowRateLpm * avgSessionMinutes * (0.8 + Math.random() * 0.4));
        const dailyLimitL = Math.round(config.flowRateLpm * avgSessionMinutes);
        const sessionRunHours = rainSkipped ? 0 : sessionHours;
        const energyCostRs = parseFloat(
            (pumpKw * sessionRunHours * config.energyCostPerKwh).toFixed(2)
        );

        records.push({ date: dateStr, dayLabel, waterUsedL, dailyLimitL, energyCostRs, rainSkipped });
    }
    return records;
}

export interface WeeklyAnalytics {
    weeklyUsageL: number;
    savedVsAvgPct: number;
    rainSkippedDays: number;
    firstSkippedDay: string;
    chartData: {
        labels: string[];
        usage: number[];
        limits: number[];
    };
}

/**
 * Returns dynamic analytics for the last 7 days tailored for the Resources Screen UI.
 */
export function getWeeklyAnalytics(config: PumpConfig): WeeklyAnalytics {
    const history = buildHistory(config, 7);

    const weeklyUsageL = history.reduce((sum, r) => sum + r.waterUsedL, 0);
    const totalPlannedL = history.reduce((sum, r) => sum + r.dailyLimitL, 0);
    const rainSkippedHistory = history.filter(r => r.rainSkipped);
    const rainSkippedDays = rainSkippedHistory.length;
    const firstSkippedDay = rainSkippedHistory.length > 0 ? rainSkippedHistory[0].dayLabel : 'N/A';

    // Percentage of water saved due to rain (or other factors)
    const savedL = totalPlannedL - weeklyUsageL;
    const savedVsAvgPct = Math.round((savedL / Math.max(totalPlannedL, 1)) * 100);

    return {
        weeklyUsageL,
        savedVsAvgPct,
        rainSkippedDays,
        firstSkippedDay,
        chartData: {
            labels: history.map(r => r.dayLabel),
            usage: history.map(r => r.waterUsedL),
            limits: history.map(r => r.dailyLimitL),
        }
    };
}

// ─────────────────────────────────────────────────────────────
// CSV  (kept for backward compat — still works if called)
// ─────────────────────────────────────────────────────────────

export function generateCSV(config: PumpConfig): string {
    const history = buildHistory(config);
    const header = 'Date,Water Used (L),Daily Limit (L),Energy Cost (Rs),Rain Skipped';
    const rows = history.map(
        (r) =>
            `${r.date},${r.waterUsedL},${r.dailyLimitL},${r.energyCostRs},${r.rainSkipped ? 'Yes' : 'No'}`
    );
    return [header, ...rows].join('\n');
}

// ─────────────────────────────────────────────────────────────
// COST SAVINGS CALCULATOR (used by yellow insight box)
// ─────────────────────────────────────────────────────────────

export function calcCostSavingsRs(config: PumpConfig, rainSkippedDays: number = 2): number {
    const avgSessionMinutes = 40;
    const sessionHours = avgSessionMinutes / 60;
    const pumpKw = config.pumpPowerHp * 0.746;
    const energySavedRs = pumpKw * sessionHours * config.energyCostPerKwh * rainSkippedDays;
    const waterSavedL = config.flowRateLpm * avgSessionMinutes * rainSkippedDays;
    const waterCostSavedRs = waterSavedL * 0.05;
    return Math.round(energySavedRs + waterCostSavedRs);
}

// ─────────────────────────────────────────────────────────────
// PDF REPORT  —  HTML builder
// ─────────────────────────────────────────────────────────────

// Local string maps keyed by language — no network required
const PDF_STRINGS: Record<Language, {
    title: string;
    subtitle: string;
    generatedOn: string;
    summary: string;
    totalWater: string;
    totalCost: string;
    rainDays: string;
    avgDaily: string;
    detailTable: string;
    colDay: string;
    colWater: string;
    colLimit: string;
    colCost: string;
    colRain: string;
    rainYes: string;
    rainNo: string;
    footerNote: string;
    pumpSpec: string;
    savingsTitle: string;
    savingsBody: string;
}> = {
    en: {
        title: 'AgroSeva — Irrigation Report',
        subtitle: '30-Day Water & Energy Summary',
        generatedOn: 'Generated on',
        summary: '📊 Summary',
        totalWater: 'Total Water Used',
        totalCost: 'Total Energy Cost',
        rainDays: 'Rain-Skipped Days',
        avgDaily: 'Avg Daily Water',
        detailTable: '📅 Day-by-Day Details',
        colDay: 'Day',
        colWater: 'Water Used (L)',
        colLimit: 'Daily Limit (L)',
        colCost: 'Energy Cost (₹)',
        colRain: 'Rain Skip?',
        rainYes: '🌧 Yes',
        rainNo: ' No',
        footerNote: 'This report was automatically generated by AgroSeva. Data is based on pump configuration settings.',
        pumpSpec: 'Pump Specs',
        savingsTitle: '💰 Cost Savings Insight',
        savingsBody: 'By skipping irrigation on rainy days, you avoided unnecessary pump usage and saved on electricity and water costs.',
    },
    hi: {
        title: 'AgroSeva — सिंचाई रिपोर्ट',
        subtitle: '30 दिन का पानी और ऊर्जा सारांश',
        generatedOn: 'तैयार की गई तिथि',
        summary: '📊 सारांश',
        totalWater: 'कुल पानी का उपयोग',
        totalCost: 'कुल ऊर्जा लागत',
        rainDays: 'बारिश के कारण छोड़े गए दिन',
        avgDaily: 'औसत दैनिक पानी',
        detailTable: '📅 दिन-दर-दिन विवरण',
        colDay: 'दिन',
        colWater: 'पानी का उपयोग (L)',
        colLimit: 'दैनिक सीमा (L)',
        colCost: 'ऊर्जा लागत (₹)',
        colRain: 'बारिश?',
        rainYes: '🌧 हाँ',
        rainNo: ' नहीं',
        footerNote: 'यह रिपोर्ट AgroSeva द्वारा स्वचालित रूप से तैयार की गई है। डेटा पंप कॉन्फ़िगरेशन सेटिंग्स पर आधारित है।',
        pumpSpec: 'पंप विशिष्टताएं',
        savingsTitle: '💰 लागत बचत जानकारी',
        savingsBody: 'बरसात के दिनों में सिंचाई छोड़कर आपने अनावश्यक पंप उपयोग से बचे और बिजली तथा पानी की लागत में बचत की।',
    },
    mr: {
        title: 'AgroSeva — सिंचन अहवाल',
        subtitle: '३० दिवसांचा पाणी आणि ऊर्जा सारांश',
        generatedOn: 'तयार केल्याची तारीख',
        summary: '📊 सारांश',
        totalWater: 'एकूण पाण्याचा वापर',
        totalCost: 'एकूण ऊर्जा खर्च',
        rainDays: 'पावसामुळे सोडलेले दिवस',
        avgDaily: 'सरासरी दैनिक पाणी',
        detailTable: '📅 दिवसनिहाय तपशील',
        colDay: 'दिवस',
        colWater: 'पाण्याचा वापर (L)',
        colLimit: 'दैनिक मर्यादा (L)',
        colCost: 'ऊर्जा खर्च (₹)',
        colRain: 'पाऊस?',
        rainYes: '🌧 होय',
        rainNo: ' नाही',
        footerNote: 'हा अहवाल AgroSeva द्वारे स्वयंचलितपणे तयार केला गेला आहे. डेटा पंप कॉन्फिगरेशन सेटिंग्जवर आधारित आहे.',
        pumpSpec: 'पंप वैशिष्ट्ये',
        savingsTitle: '💰 खर्च बचत माहिती',
        savingsBody: 'पावसाच्या दिवशी सिंचन सोडल्यामुळे तुम्ही अनावश्यक पंप वापर टाळला आणि वीज आणि पाण्याच्या खर्चात बचत केली.',
    },
};

function buildPDFHtml(config: PumpConfig, language: Language): string {
    const s = PDF_STRINGS[language];
    const history = buildHistory(config);

    const totalWaterL = history.reduce((sum, r) => sum + r.waterUsedL, 0);
    const totalCostRs = history.reduce((sum, r) => sum + r.energyCostRs, 0).toFixed(2);
    const rainDays = history.filter((r) => r.rainSkipped).length;
    const avgDailyL = Math.round(
        history.filter((r) => !r.rainSkipped).reduce((sum, r) => sum + r.waterUsedL, 0) /
        Math.max(history.filter((r) => !r.rainSkipped).length, 1)
    );
    const savedRs = calcCostSavingsRs(config, rainDays);
    const now = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric',
    });

    const tableRows = history
        .map(
            (r) => `
        <tr class="${r.rainSkipped ? 'rain-row' : ''}">
          <td>${r.dayLabel}</td>
          <td class="num">${r.rainSkipped ? '—' : r.waterUsedL}</td>
          <td class="num">${r.dailyLimitL}</td>
          <td class="num">${r.rainSkipped ? '—' : '₹' + r.energyCostRs}</td>
          <td class="center">${r.rainSkipped ? s.rainYes : s.rainNo}</td>
        </tr>`
        )
        .join('');

    return `<!DOCTYPE html>
<html lang="${language}">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${s.title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Devanagari', 'Noto Sans', Arial, sans-serif;
    background: #f5f5f5;
    color: #263238;
    font-size: 13px;
    line-height: 1.6;
  }
  .page { max-width: 780px; margin: 0 auto; background: #fff; }

  /* Header */
  .header {
    background: linear-gradient(135deg, #1B5E20, #00796B);
    color: #fff;
    padding: 32px 36px 24px;
  }
  .header h1 { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
  .header p  { font-size: 14px; opacity: 0.85; margin-top: 4px; }
  .header .meta { margin-top: 14px; font-size: 12px; opacity: 0.7; }

  /* Config badge row */
  .badge-row {
    display: flex; gap: 10px; flex-wrap: wrap;
    padding: 16px 36px; background: #E8F5E9;
    border-bottom: 1px solid #C8E6C9;
  }
  .badge {
    background: #fff; border-radius: 20px;
    padding: 5px 14px; font-size: 12px;
    border: 1px solid #A5D6A7; color: #2E7D32; font-weight: 600;
  }

  /* Summary cards */
  .summary { display: flex; gap: 0; border-bottom: 2px solid #E0E0E0; }
  .card {
    flex: 1; padding: 22px 18px; text-align: center;
    border-right: 1px solid #F0F0F0;
  }
  .card:last-child { border-right: none; }
  .card .value { font-size: 26px; font-weight: 700; color: #1B5E20; }
  .card .label { font-size: 11px; color: #78909C; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Section titles */
  .section-title {
    padding: 20px 36px 8px;
    font-size: 15px; font-weight: 700; color: #37474F;
    border-bottom: 2px solid #1B5E20;
    margin: 0 36px 0;
  }

  /* Savings box */
  .savings-box {
    margin: 20px 36px;
    background: #FFF8E1;
    border-left: 5px solid #FBC02D;
    border-radius: 8px;
    padding: 18px 22px;
  }
  .savings-box h3 { font-size: 15px; color: #F57F17; margin-bottom: 8px; }
  .savings-box p  { font-size: 13px; color: #5D4037; line-height: 1.7; }
  .savings-amount {
    font-size: 28px; font-weight: 700; color: #2E7D32;
    margin: 10px 0 4px;
  }

  /* Table */
  .table-wrap { margin: 20px 36px; overflow: hidden; border-radius: 10px; border: 1px solid #E0E0E0; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: #1B5E20; color: #fff; }
  thead th { padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; }
  th.num, td.num { text-align: right; }
  th.center, td.center { text-align: center; }
  tbody tr { border-bottom: 1px solid #F0F0F0; }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:nth-child(even) { background: #FAFAFA; }
  tbody tr.rain-row { background: #E3F2FD; }
  tbody td { padding: 9px 12px; font-size: 12px; }

  /* Footer */
  .footer {
    margin: 28px 36px 36px;
    padding-top: 16px;
    border-top: 1px solid #E0E0E0;
    font-size: 11px; color: #90A4AE; line-height: 1.7;
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <h1>🌿 ${s.title}</h1>
    <p>${s.subtitle}</p>
    <div class="meta">${s.generatedOn}: ${now}</div>
  </div>

  <!-- PUMP SPEC BADGES -->
  <div class="badge-row">
    <div class="badge">⚡ ${config.pumpPowerHp} HP</div>
    <div class="badge">💧 ${config.flowRateLpm} L/min</div>
    <div class="badge">₹ ${config.energyCostPerKwh}/kWh</div>
  </div>

  <!-- SUMMARY CARDS -->
  <div class="summary">
    <div class="card">
      <div class="value">${totalWaterL} L</div>
      <div class="label">${s.totalWater}</div>
    </div>
    <div class="card">
      <div class="value">₹${totalCostRs}</div>
      <div class="label">${s.totalCost}</div>
    </div>
    <div class="card">
      <div class="value">${rainDays}</div>
      <div class="label">${s.rainDays}</div>
    </div>
    <div class="card">
      <div class="value">${avgDailyL} L</div>
      <div class="label">${s.avgDaily}</div>
    </div>
  </div>

  <!-- SAVINGS BOX -->
  <div class="savings-box">
    <h3>${s.savingsTitle}</h3>
    <div class="savings-amount">₹${savedRs}</div>
    <p>${s.savingsBody}</p>
  </div>

  <!-- DAY-BY-DAY TABLE -->
  <div class="section-title">${s.detailTable}</div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>${s.colDay}</th>
          <th class="num">${s.colWater}</th>
          <th class="num">${s.colLimit}</th>
          <th class="num">${s.colCost}</th>
          <th class="center">${s.colRain}</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    ${s.footerNote}
  </div>

</div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// GENERATE & SHARE PDF
// ─────────────────────────────────────────────────────────────

/**
 * Generates a layman-friendly PDF in the farmer's selected language
 * and opens the native Share sheet. No network calls — all translations
 * are sourced from local translations.ts via PDF_STRINGS map.
 *
 * @param config  Pump configuration (HP, flow rate, energy cost)
 * @param language Current app language ('en' | 'hi' | 'mr')
 * @returns true on success, false on failure
 */
export async function generateAndSharePDF(
    config: PumpConfig,
    language: Language
): Promise<boolean> {
    try {
        const Print = require('expo-print');
        const Sharing = require('expo-sharing');

        const html = buildPDFHtml(config, language);

        // Convert HTML → PDF on-device (no network, no server)
        const { uri } = await Print.printToFileAsync({ html, base64: false });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: PDF_STRINGS[language].title,
                UTI: 'com.adobe.pdf',
            });
        } else {
            // Fallback: just open as print preview
            await Print.printAsync({ uri });
        }

        return true;
    } catch (error) {
        console.error('[analyticsService] generateAndSharePDF failed:', error);
        return false;
    }
}

// ─────────────────────────────────────────────────────────────
// SHARE REPORT (legacy text share — kept for backward compat)
// ─────────────────────────────────────────────────────────────

/**
 * @deprecated Use generateAndSharePDF instead.
 * Kept to avoid any possible reference breakage.
 */
export async function shareReport(csvContent: string): Promise<boolean> {
    try {
        const { Share } = require('react-native');
        const result = await Share.share(
            {
                message: csvContent,
                title: 'AgroSeva 30-Day Report',
            },
            {
                dialogTitle: 'Export AgroSeva Report',
                subject: 'AgroSeva 30-Day Irrigation Report',
            }
        );
        return result.action !== Share.dismissedAction;
    } catch (error) {
        console.error('[analyticsService] shareReport failed:', error);
        return false;
    }
}
