/**
 * Carbon Pricing Module — Scout AI Retrofit App
 * 
 * CRITICAL UPDATE (v3): Federal consumer carbon charge (fuel charge) ELIMINATED
 * effective April 1, 2025. This applies to all federal backstop provinces
 * (ON, AB, SK, MB, NB, NS, PE, NL, YT, NT, NU).
 * 
 * BC and Quebec retain their own provincial carbon pricing systems.
 * Industrial OBPS (Output-Based Pricing System) remains for large emitters
 * but does NOT apply to commercial building gas consumption.
 * 
 * For financial modelling: carbon avoidance savings = $0 for backstop provinces
 * from 2025 forward. Retain historical schedule for pre-2025 analysis.
 */

// Federal Backstop Schedule — HISTORICAL ONLY ($/tonne CO₂e)
// Federal fuel charge ELIMINATED April 1, 2025
// Retained for pre-2025 analysis and for provinces that adopt own systems
export const FEDERAL_CARBON_SCHEDULE: Record<number, number> = {
  2023: 65,
  2024: 80,
  2025: 95,
  2026: 110,
  2027: 125,
  2028: 140,
  2029: 155,
  2030: 170,
};

// Quebec Cap & Trade baseline (approximate market clearing price)
const QC_CAP_TRADE_BASE_2023 = 35; // $/tonne
const QC_CAP_TRADE_GROWTH = 0.05; // ~5% annual growth

// BC Carbon Tax (leads federal, higher rate)
const BC_CARBON_TAX_2025 = 80; // $/tonne (BC rate as of 2025)

// Natural gas emission factor
export const NG_EMISSION_FACTOR_KG_PER_M3 = 1.888; // kg CO₂ per m³ of natural gas
export const NG_EMISSION_FACTOR_T_PER_M3 = 0.001888; // tonnes CO₂ per m³

// Electricity emission factors by province (gCO₂e/kWh)
export const ELEC_EMISSION_FACTORS: Record<string, number> = {
  ON: 25,   // Ontario — very clean grid (nuclear + hydro)
  QC: 2,    // Quebec — almost 100% hydro
  BC: 11,   // BC — hydro dominated
  AB: 540,  // Alberta — heavy gas/coal
  SK: 650,  // Saskatchewan — coal heavy
  MB: 3,    // Manitoba — hydro
  NS: 690,  // Nova Scotia — coal
  NB: 300,  // New Brunswick — mixed
  PE: 5,    // PEI — wind + imports
  NL: 20,   // Newfoundland — hydro
  YT: 80,
  NT: 400,
  NU: 900,  // Nunavut — diesel
};

/**
 * Get the carbon price for a given year and province
 */
export function getCarbonPriceForYear(year: number, province: string = 'ON'): number {
  const p = province.toUpperCase();

  // Quebec: separate Cap & Trade system — REMAINS ACTIVE
  if (p === 'QC') {
    const yearsFrom2023 = Math.max(0, year - 2023);
    return Math.round(QC_CAP_TRADE_BASE_2023 * Math.pow(1 + QC_CAP_TRADE_GROWTH, yearsFrom2023));
  }

  // BC: own carbon tax — REMAINS ACTIVE (provincial legislation)
  if (p === 'BC') {
    const bcBase = BC_CARBON_TAX_2025;
    const yearsFrom2025 = Math.max(0, year - 2025);
    return Math.min(bcBase + (yearsFrom2025 * 15), 170);
  }

  // All other provinces: Federal backstop — ELIMINATED April 2025
  // No forward carbon cost for commercial gas consumption
  return getFederalCarbonPrice(year);
}

/**
 * Get the federal carbon price for a given year
 */
export function getFederalCarbonPrice(year: number): number {
  if (year <= 2022) return 50;
  
  // Look up schedule
  if (FEDERAL_CARBON_SCHEDULE[year] !== undefined) {
    return FEDERAL_CARBON_SCHEDULE[year];
  }
  
  // Cap at 2030 price ($170)
  if (year > 2030) return 170;
  
  return 0;
}

/**
 * Get carbon charge per m³ of natural gas for a given year
 */
export function getCarbonChargePerM3(year: number, province: string = 'ON'): number {
  const pricePerTonne = getCarbonPriceForYear(year, province);
  return pricePerTonne * NG_EMISSION_FACTOR_T_PER_M3;
}

/**
 * Project carbon costs over N years for a given gas consumption
 */
export interface CarbonProjectionYear {
  year: number;
  carbonPrice: number;        // $/tonne
  chargePerM3: number;        // $/m³
  annualCarbonCost: number;   // total $
  cumulativeCost: number;     // cumulative $
}

export function projectCarbonCosts(
  startYear: number,
  projectionYears: number,
  annualGasM3: number,
  province: string = 'ON',
  gasReductionPct: number = 0 // % reduction after retrofit
): { baseline: CarbonProjectionYear[], retrofit: CarbonProjectionYear[] } {
  const baseline: CarbonProjectionYear[] = [];
  const retrofit: CarbonProjectionYear[] = [];
  let cumBaseline = 0;
  let cumRetrofit = 0;

  for (let i = 0; i <= projectionYears; i++) {
    const year = startYear + i;
    const carbonPrice = getCarbonPriceForYear(year, province);
    const chargePerM3 = carbonPrice * NG_EMISSION_FACTOR_T_PER_M3;

    const baselineCost = annualGasM3 * chargePerM3;
    cumBaseline += baselineCost;
    baseline.push({ year, carbonPrice, chargePerM3, annualCarbonCost: baselineCost, cumulativeCost: cumBaseline });

    const retrofitGas = annualGasM3 * (1 - gasReductionPct);
    const retrofitCost = retrofitGas * chargePerM3;
    cumRetrofit += retrofitCost;
    retrofit.push({ year, carbonPrice, chargePerM3, annualCarbonCost: retrofitCost, cumulativeCost: cumRetrofit });
  }

  return { baseline, retrofit };
}

/**
 * Get electricity emission factor for a province
 */
export function getElecEmissionFactor(province: string): number {
  return ELEC_EMISSION_FACTORS[province.toUpperCase()] || 25; // Default to Ontario
}

/**
 * Utility rate estimates by province ($/kWh electricity, $/m³ gas)
 */
export const UTILITY_RATES: Record<string, { elecRate: number; gasRate: number }> = {
  ON: { elecRate: 0.13, gasRate: 0.35 },   // Ontario: TOU blended ~$0.13/kWh, Enbridge ~$0.35/m³
  QC: { elecRate: 0.07, gasRate: 0.55 },   // Quebec: cheap hydro, expensive gas
  BC: { elecRate: 0.12, gasRate: 0.45 },
  AB: { elecRate: 0.17, gasRate: 0.25 },   // Alberta: expensive elec, cheap gas
  SK: { elecRate: 0.18, gasRate: 0.28 },
  MB: { elecRate: 0.09, gasRate: 0.32 },
  NS: { elecRate: 0.17, gasRate: 0.60 },
  NB: { elecRate: 0.13, gasRate: 0.55 },
  PE: { elecRate: 0.16, gasRate: 0.70 },
  NL: { elecRate: 0.12, gasRate: 0.65 },
};

export function getUtilityRates(province: string): { elecRate: number; gasRate: number } {
  return UTILITY_RATES[province.toUpperCase()] || UTILITY_RATES['ON'];
}
