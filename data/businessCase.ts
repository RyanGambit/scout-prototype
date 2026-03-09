/**
 * NINE-LEVER BUSINESS CASE FRAMEWORK
 * Source: 55 King St E Retrofit Financial Model v4 — Section 5
 *
 * The business case for deep commercial retrofit in Ontario at 2026 energy prices
 * cannot rest on utility bill savings alone. The correct framing presents nine
 * independently verifiable financial and structural levers.
 *
 * KEY CORRECTIONS v4:
 * - All 20-year values use 2% annual escalation (not flat multiplication)
 * - L5 Submetering reframed as NOI protection (not additive cash flow)
 * - L6 corrected for occupancy (85% vs 100%)
 * - L7 vacancy improvement sequential with L6 (not independent)
 * - L8 Regulatory Risk: $0 for non-Toronto buildings (qualitative only)
 * - L9 Lifecycle: incremental cost framing ($159K net of incentives)
 * - Carbon charge eliminated April 2025 — no forward carbon cost
 */

export interface BusinessCaseLever {
  id: string;
  leverNumber: number;
  name: string;
  category: 'Capital Reduction' | 'Financing Saving' | 'Operating Saving' | 'Revenue' | 'Asset Value' | 'Risk Narrative' | 'Capital Efficiency' | 'NOI Protection';
  conservativeEstimate: number;
  baseCaseEstimate: number;
  bankabilityRating: 1 | 2 | 3 | 4 | 5;
  bankabilityLabel: string;
  isQuantified: boolean;
  isAdditive: boolean; // Whether it should be added to total value
  basis: string;
  nextAction: string;
  notes?: string;
  dependencies?: string[];
}

export interface BusinessCaseResult {
  levers: BusinessCaseLever[];
  conservativeTotal: number;
  baseCaseTotal: number;
  netProjectCost: number;
  conservativeMultiple: number;
  baseCaseMultiple: number;
  solarPaybackYears: number;
  bridgeFinancingCost: number;
}

/**
 * Calculate the 9-lever business case for a building retrofit
 */
export function calculateBusinessCase(params: {
  grossCapex: number;
  netCapex: number; // After all incentives
  incentiveTotal: number;
  cibRate: number;
  commercialRate: number;
  loanTerm: number; // years
  annualEnergySavings: number; // Year 1 (excl solar)
  annualSolarRevenue: number; // Year 1
  solarCapitalCost: number;
  solarCtItc: number;
  escalationRate: number; // typically 0.02
  capRate: number;
  rentPerSqft: number;
  buildingSqft: number;
  currentOccupancy: number; // 0-1
  targetOccupancy: number; // 0-1
  greenPremiumPct: number; // typically 0.04
  isTorontoBEPS: boolean;
  boilerReplacementCost: number;
  ashpCost: number;
  ashpIncentives: number;
  ctItcAmount: number;
  submeteringCost: number;
}): BusinessCaseResult {
  const {
    grossCapex, netCapex, incentiveTotal,
    cibRate, commercialRate, loanTerm,
    annualEnergySavings, annualSolarRevenue, solarCapitalCost, solarCtItc,
    escalationRate, capRate, rentPerSqft, buildingSqft,
    currentOccupancy, targetOccupancy, greenPremiumPct,
    isTorontoBEPS, boilerReplacementCost, ashpCost, ashpIncentives,
    ctItcAmount, submeteringCost,
  } = params;

  // Escalation factor for 20-year sums: sum of (1+r)^n for n=0..19
  const escalationFactor20 = Array.from({ length: 20 }, (_, i) => Math.pow(1 + escalationRate, i)).reduce((a, b) => a + b, 0);

  // CIB interest savings (amortizing schedule)
  const cibSavings20 = calculateAmortizingInterestSavings(netCapex, cibRate, commercialRate, loanTerm);
  const cibSavingsLow = calculateAmortizingInterestSavings(netCapex, 0.035, commercialRate, loanTerm); // High CIB rate
  const cibSavingsHigh = calculateAmortizingInterestSavings(netCapex, 0.020, commercialRate, loanTerm); // Low CIB rate

  // L1: Incentive Cash Stack
  const l1: BusinessCaseLever = {
    id: 'l1-incentives',
    leverNumber: 1,
    name: 'Incentive Cash Stack',
    category: 'Capital Reduction',
    conservativeEstimate: incentiveTotal,
    baseCaseEstimate: incentiveTotal,
    bankabilityRating: 5,
    bankabilityLabel: 'HIGH — Pre-approval letters are bankable commitments',
    isQuantified: true,
    isAdditive: true,
    basis: `IESO + Enbridge pre-approval + CT ITC Schedule 31. Total: $${(incentiveTotal / 1000).toFixed(0)}K.`,
    nextAction: 'Obtain IESO pre-approval → Enbridge pre-approval → CPA for CT ITC Schedule 31',
  };

  // L2: CIB Low-Interest Financing
  const l2: BusinessCaseLever = {
    id: 'l2-cib-financing',
    leverNumber: 2,
    name: 'Low-Interest CIB Financing',
    category: 'Financing Saving',
    conservativeEstimate: cibSavingsLow,
    baseCaseEstimate: cibSavingsHigh,
    bankabilityRating: 5,
    bankabilityLabel: 'HIGH — CIB term sheets are standard lender collateral',
    isQuantified: true,
    isAdditive: true,
    basis: `Net $${(netCapex / 1000).toFixed(0)}K at CIB 2.0-3.5% vs ${(commercialRate * 100).toFixed(1)}% commercial. Amortizing schedule. Present as range to lenders.`,
    nextAction: 'Commission ASHRAE L2 audit confirming ≥30% GHG reduction → Apply to CIB',
  };

  // L3: Energy Bill Savings (excl solar)
  const energySavings20 = Math.round(annualEnergySavings * escalationFactor20);
  const l3: BusinessCaseLever = {
    id: 'l3-energy-savings',
    leverNumber: 3,
    name: 'Energy Bill Savings',
    category: 'Operating Saving',
    conservativeEstimate: energySavings20,
    baseCaseEstimate: energySavings20,
    bankabilityRating: 4,
    bankabilityLabel: 'MEDIUM — Requires verified energy model (RETScreen/EnergyPlus)',
    isQuantified: true,
    isAdditive: true,
    basis: `$${(annualEnergySavings / 1000).toFixed(1)}K/yr Y1 escalating at ${(escalationRate * 100).toFixed(0)}%/yr. 20yr: $${(energySavings20 / 1000).toFixed(0)}K. Carbon charge eliminated April 2025 — gas at commodity rate only.`,
    nextAction: 'ASHRAE L2 energy model. Separate solar PV to standalone payback analysis.',
  };

  // L4: Solar PV Net Metering Revenue
  const solarRevenue20 = Math.round(annualSolarRevenue * escalationFactor20);
  const solarPayback = annualSolarRevenue > 0 ? (solarCapitalCost - solarCtItc) / annualSolarRevenue : Infinity;
  const l4: BusinessCaseLever = {
    id: 'l4-solar-revenue',
    leverNumber: 4,
    name: 'Solar PV Net Metering',
    category: 'Revenue',
    conservativeEstimate: solarRevenue20,
    baseCaseEstimate: solarRevenue20,
    bankabilityRating: 4,
    bankabilityLabel: 'HIGH — IESO pre-approval + CT ITC + Ontario net metering O. Reg. 541/05',
    isQuantified: true,
    isAdditive: true,
    basis: `$${(annualSolarRevenue / 1000).toFixed(0)}K/yr Y1, 20yr: $${(solarRevenue20 / 1000).toFixed(0)}K. Payback: ${solarPayback.toFixed(1)} years.`,
    nextAction: 'Verify with IESO whether solar qualifies for Prescriptive vs Custom. Engage solar installer for PVWatts model.',
  };

  // L5: Smart Submetering (NOI Protection — NOT additive)
  const l5: BusinessCaseLever = {
    id: 'l5-submetering',
    leverNumber: 5,
    name: 'Smart Submetering — NOI Protection',
    category: 'NOI Protection',
    conservativeEstimate: 0,
    baseCaseEstimate: 0,
    bankabilityRating: 3,
    bankabilityLabel: 'MEDIUM — Transfer of utility cost risk, not additive cash flow',
    isQuantified: false,
    isAdditive: false,
    basis: `REFRAMING: Submetering transfers utility billing to tenants. Hardware: $${(submeteringCost / 1000).toFixed(0)}K. Payback from billing accuracy: 2-3yr. Do NOT book behavioral savings as landlord cash flow.`,
    nextAction: 'Source 3 quotes from Ontario submetering providers. Install pre-retrofit to establish EPP baseline.',
    notes: 'Structural NOI improvement, not a cash flow add',
  };

  // L6: Green Certification Rent Premium
  const greenPremiumRevenue = rentPerSqft * buildingSqft * currentOccupancy * greenPremiumPct;
  const greenPremiumAssetValue = Math.round(greenPremiumRevenue / capRate);
  const greenPremiumFullOcc = Math.round((rentPerSqft * buildingSqft * targetOccupancy * greenPremiumPct) / capRate);
  const l6: BusinessCaseLever = {
    id: 'l6-green-premium',
    leverNumber: 6,
    name: 'Green Certification Rent Premium',
    category: 'Asset Value',
    conservativeEstimate: greenPremiumAssetValue,
    baseCaseEstimate: greenPremiumFullOcc,
    bankabilityRating: 4,
    bankabilityLabel: 'HIGH — CBRE Canada research. Uncertified buildings = higher default risk.',
    isQuantified: true,
    isAdditive: true,
    basis: `${(greenPremiumPct * 100).toFixed(0)}% premium on $${rentPerSqft}/sqft × ${buildingSqft.toLocaleString()} sqft × ${(currentOccupancy * 100).toFixed(0)}% occ = $${(greenPremiumRevenue / 1000).toFixed(0)}K/yr, cap at ${(capRate * 100).toFixed(0)}% = $${(greenPremiumAssetValue / 1000).toFixed(0)}K.`,
    nextAction: 'Target ENERGY STAR 75+ and BOMA BEST Gold. Present CBRE market evidence to lender.',
    dependencies: ['l7-vacancy'],
    notes: 'At full occupancy (post-L7): $' + (greenPremiumFullOcc / 1000).toFixed(0) + 'K. L6 and L7 are sequential.',
  };

  // L7: Vacancy Improvement
  const vacancyDelta = targetOccupancy - currentOccupancy;
  const vacancyRevenue = vacancyDelta * buildingSqft * rentPerSqft;
  const vacancyAssetValue = vacancyDelta > 0 ? Math.round(vacancyRevenue / capRate) : 0;
  const l7: BusinessCaseLever = {
    id: 'l7-vacancy',
    leverNumber: 7,
    name: 'Vacancy Improvement (Flight to Quality)',
    category: 'Asset Value',
    conservativeEstimate: 0,
    baseCaseEstimate: vacancyAssetValue,
    bankabilityRating: 4,
    bankabilityLabel: 'HIGH — CBRE: certified buildings vacancy 4.9 pts below non-prime nationally',
    isQuantified: true,
    isAdditive: true,
    basis: `Vacancy ${((1 - currentOccupancy) * 100).toFixed(0)}% → ${((1 - targetOccupancy) * 100).toFixed(0)}% on ${buildingSqft.toLocaleString()} sqft @ $${rentPerSqft}/sqft = $${(vacancyRevenue / 1000).toFixed(0)}K/yr, cap at ${(capRate * 100).toFixed(0)}% = $${(vacancyAssetValue / 1000).toFixed(0)}K.`,
    nextAction: 'Negotiate green lease addenda at renewal. Show CBRE research to lender. Present L6+L7 as combined scenario.',
    dependencies: ['l6-green-premium'],
    notes: 'L6 + L7 combined base case: $' + ((greenPremiumFullOcc + vacancyAssetValue) / 1000).toFixed(0) + 'K. Conservative excludes L7.',
  };

  // L8: Regulatory Trajectory Risk
  const l8: BusinessCaseLever = {
    id: 'l8-regulatory',
    leverNumber: 8,
    name: 'Regulatory Trajectory Risk',
    category: 'Risk Narrative',
    conservativeEstimate: 0,
    baseCaseEstimate: 0,
    bankabilityRating: isTorontoBEPS ? 3 : 2,
    bankabilityLabel: isTorontoBEPS
      ? 'MEDIUM — Toronto BEPS penalties apply directly'
      : 'LOW-MEDIUM — Non-Toronto: qualitative narrative only',
    isQuantified: false,
    isAdditive: false,
    basis: isTorontoBEPS
      ? 'Toronto BEPS mandatory penalties applicable. Quantify avoided premium.'
      : 'GEOGRAPHIC NOTE: Toronto BEPS penalties do NOT apply outside Toronto. Use as directional narrative only ("this is where Ontario is heading"). Do not quantify.',
    nextAction: isTorontoBEPS
      ? 'Document current BEPS compliance gap and penalty timeline.'
      : 'Use Toronto BEPS and Vancouver carbon limits as NARRATIVE context in lender presentation. Do not quantify for non-Toronto buildings.',
  };

  // L9: Lifecycle Alignment
  const incrementalCost = ashpCost - boilerReplacementCost;
  const netIncrementalCost = incrementalCost - ashpIncentives;
  const l9: BusinessCaseLever = {
    id: 'l9-lifecycle',
    leverNumber: 9,
    name: 'Lifecycle Alignment (End-of-Life Capital Efficiency)',
    category: 'Capital Efficiency',
    conservativeEstimate: netIncrementalCost,
    baseCaseEstimate: netIncrementalCost,
    bankabilityRating: 5,
    bankabilityLabel: 'HIGH — Reframe as mandatory replacement capex plus efficiency premium',
    isQuantified: true,
    isAdditive: false, // Not additive — it's a reframing of existing capex
    basis: `Standard boiler: $${(boilerReplacementCost / 1000).toFixed(0)}K. ASHP: $${(ashpCost / 1000).toFixed(0)}K. Incremental: $${(incrementalCost / 1000).toFixed(0)}K. Net of incentives: $${(netIncrementalCost / 1000).toFixed(0)}K. Equipment is end-of-life — replacement is mandatory regardless.`,
    nextAction: '"Your boiler requires replacement regardless — the question is what to replace it with, and the incremental cost is $' + (netIncrementalCost / 1000).toFixed(0) + 'K net of incentives."',
  };

  const levers = [l1, l2, l3, l4, l5, l6, l7, l8, l9];

  const conservativeTotal = levers
    .filter(l => l.isAdditive && l.isQuantified)
    .reduce((sum, l) => sum + l.conservativeEstimate, 0);

  const baseCaseTotal = levers
    .filter(l => l.isAdditive && l.isQuantified)
    .reduce((sum, l) => sum + l.baseCaseEstimate, 0);

  const bridgeFinancingCost = Math.round(ctItcAmount * commercialRate * 1.25); // 15 months

  return {
    levers,
    conservativeTotal,
    baseCaseTotal,
    netProjectCost: netCapex,
    conservativeMultiple: netCapex > 0 ? conservativeTotal / netCapex : 0,
    baseCaseMultiple: netCapex > 0 ? baseCaseTotal / netCapex : 0,
    solarPaybackYears: solarPayback,
    bridgeFinancingCost,
  };
}

/**
 * Calculate 20-year interest savings from CIB vs commercial amortizing loans
 * Both modelled as monthly-compounding amortizing mortgage schedules
 */
function calculateAmortizingInterestSavings(
  principal: number,
  cibRate: number,
  commercialRate: number,
  termYears: number
): number {
  const months = termYears * 12;
  const cibMonthly = cibRate / 12;
  const commMonthly = commercialRate / 12;

  const cibPayment = principal * (cibMonthly * Math.pow(1 + cibMonthly, months)) /
    (Math.pow(1 + cibMonthly, months) - 1);
  const commPayment = principal * (commMonthly * Math.pow(1 + commMonthly, months)) /
    (Math.pow(1 + commMonthly, months) - 1);

  let cibTotalInterest = 0;
  let commTotalInterest = 0;
  let cibBalance = principal;
  let commBalance = principal;

  for (let m = 0; m < months; m++) {
    const cibInterest = cibBalance * cibMonthly;
    const commInterest = commBalance * commMonthly;
    cibTotalInterest += cibInterest;
    commTotalInterest += commInterest;
    cibBalance -= (cibPayment - cibInterest);
    commBalance -= (commPayment - commInterest);
  }

  return Math.round(commTotalInterest - cibTotalInterest);
}


/**
 * Pre-built 55 King St E business case (matches v4 Section 5)
 */
export const KING_STREET_BUSINESS_CASE = calculateBusinessCase({
  grossCapex: 748000,
  netCapex: 490000,
  incentiveTotal: 258000,
  cibRate: 0.0275,       // Midpoint 2.0-3.5%
  commercialRate: 0.065,
  loanTerm: 20,
  annualEnergySavings: 12500,  // Y1, excl solar
  annualSolarRevenue: 24000,   // Y1
  solarCapitalCost: 185000,
  solarCtItc: 55500,
  escalationRate: 0.02,
  capRate: 0.07,
  rentPerSqft: 18,
  buildingSqft: 41800,
  currentOccupancy: 0.85,
  targetOccupancy: 0.90,
  greenPremiumPct: 0.04,
  isTorontoBEPS: false,    // Waterloo, not Toronto
  boilerReplacementCost: 55000,
  ashpCost: 380000,
  ashpIncentives: 166000,  // IESO $50K + Enbridge $17K + CT ITC $99K on incremental
  ctItcAmount: 130000,
  submeteringCost: 27500,  // Midpoint $20K-$35K
});
