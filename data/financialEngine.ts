/**
 * Financial Engine — Scout AI Retrofit App
 * 
 * Core corrections from mockup v1:
 * - Amortizing debt (monthly compounding, not flat annual interest)
 * - CT ITC arrives in Year 1 (not Day 0)
 * - Energy savings escalate at 3%/yr
 * - Carbon costs use actual federal schedule
 * - CIB vs commercial interest comparison tracks correctly
 */

import { getCarbonPriceForYear, NG_EMISSION_FACTOR_T_PER_M3 } from './carbonPricing';

// ========================================
// AMORTIZING DEBT CALCULATOR
// ========================================

export interface AmortizationScheduleYear {
  year: number;
  beginningBalance: number;
  annualPayment: number;
  interestPortion: number;
  principalPortion: number;
  endingBalance: number;
}

export interface AmortizationResult {
  monthlyPayment: number;
  annualPayment: number;
  totalInterest: number;
  totalPaid: number;
  schedule: AmortizationScheduleYear[];
}

/**
 * Calculate amortizing debt schedule with monthly compounding
 * This is the standard mortgage formula — NOT flat annual interest
 */
export function calculateAmortizingSchedule(
  principal: number,
  annualRate: number,
  years: number
): AmortizationResult {
  if (principal <= 0 || annualRate <= 0 || years <= 0) {
    return { monthlyPayment: 0, annualPayment: 0, totalInterest: 0, totalPaid: 0, schedule: [] };
  }

  const monthlyRate = annualRate / 12;
  const totalMonths = years * 12;
  
  // Standard mortgage payment formula
  const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
                          (Math.pow(1 + monthlyRate, totalMonths) - 1);

  const schedule: AmortizationScheduleYear[] = [];
  let balance = principal;
  let totalInterest = 0;

  for (let year = 1; year <= years; year++) {
    const beginningBalance = balance;
    let yearInterest = 0;
    let yearPrincipal = 0;

    // Process 12 months
    for (let month = 0; month < 12; month++) {
      const monthInterest = balance * monthlyRate;
      const monthPrincipal = monthlyPayment - monthInterest;
      
      yearInterest += monthInterest;
      yearPrincipal += monthPrincipal;
      balance -= monthPrincipal;
    }

    balance = Math.max(0, balance);
    totalInterest += yearInterest;

    schedule.push({
      year,
      beginningBalance: Math.round(beginningBalance),
      annualPayment: Math.round(monthlyPayment * 12),
      interestPortion: Math.round(yearInterest),
      principalPortion: Math.round(yearPrincipal),
      endingBalance: Math.round(balance),
    });
  }

  return {
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    annualPayment: Math.round(monthlyPayment * 12),
    totalInterest: Math.round(totalInterest),
    totalPaid: Math.round(monthlyPayment * totalMonths),
    schedule,
  };
}

/**
 * Calculate CIB vs commercial interest savings (amortizing, not flat!)
 * 
 * The key insight: because both loans amortize, interest savings are
 * front-loaded and decrease each year as principal is paid down.
 * Year 1 savings ≠ Year 20 savings.
 */
export function calculateCibSavings(
  principal: number,
  cibRate: number,
  commercialRate: number,
  years: number
): {
  cibSchedule: AmortizationResult;
  commercialSchedule: AmortizationResult;
  yearlyInterestSavings: number[];
  lifetimeSavings: number;
  year1Savings: number;
  year20Savings: number;
} {
  const cibSchedule = calculateAmortizingSchedule(principal, cibRate, years);
  const commercialSchedule = calculateAmortizingSchedule(principal, commercialRate, years);

  const yearlyInterestSavings: number[] = [];
  let lifetimeSavings = 0;

  for (let i = 0; i < years; i++) {
    const cibInterest = cibSchedule.schedule[i]?.interestPortion || 0;
    const commInterest = commercialSchedule.schedule[i]?.interestPortion || 0;
    const savings = commInterest - cibInterest;
    yearlyInterestSavings.push(Math.round(savings));
    lifetimeSavings += savings;
  }

  return {
    cibSchedule,
    commercialSchedule,
    yearlyInterestSavings,
    lifetimeSavings: Math.round(lifetimeSavings),
    year1Savings: yearlyInterestSavings[0] || 0,
    year20Savings: yearlyInterestSavings[Math.min(19, yearlyInterestSavings.length - 1)] || 0,
  };
}

// ========================================
// PRO FORMA GENERATOR
// ========================================

export interface ProFormaYear {
  year: number;
  energySavings: number;       // Escalated at 3%/yr
  carbonAvoidance: number;     // Using actual federal schedule
  solarRevenue: number;        // Net metering credit
  submeteringNOI: number;      // Submetering value recovery
  totalSavings: number;        // Sum of above
  debtService: number;         // Amortizing payment (CIB or commercial)
  netCashflow: number;         // Total savings - debt service
  cumulativeCash: number;      // Running total
  ctItcRefund: number;         // Non-zero in Year 1 only
  discountFactor: number;      // For NPV calc
  presentValue: number;        // Discounted cashflow
}

export interface ProFormaResult {
  schedule: ProFormaYear[];
  npv: number;
  irr: number;
  paybackYear: number;          // Year cumulative cash turns positive
  assetValueIncrease: number;   // NOI increase / cap rate
  roiMultiple: number;          // Total cash / equity invested
}

export function generateProForma(params: {
  totalCapex: number;
  equityPct: number;
  annualEnergySavings: number;
  annualGasSavingsM3: number;
  solarAnnualRevenue?: number;
  submeteringAnnualNOI?: number;
  ctItcAmount: number;
  bridgeFinancingCost: number;
  upfrontGrants: number;
  loanPrincipal: number;
  loanRate: number;
  loanYears: number;
  discountRate: number;
  energyEscalation?: number;
  province?: string;
  startYear?: number;
  projectionYears?: number;
  capRate?: number;
}): ProFormaResult {
  const {
    totalCapex,
    equityPct,
    annualEnergySavings,
    annualGasSavingsM3,
    solarAnnualRevenue = 0,
    submeteringAnnualNOI = 0,
    ctItcAmount,
    bridgeFinancingCost,
    upfrontGrants,
    loanPrincipal,
    loanRate,
    loanYears,
    discountRate,
    energyEscalation = 0.02, // v4 corrected: 2%/yr (was 3%)
    province = 'ON',
    startYear = 2026,
    projectionYears = 20,
    capRate = 0.07,
  } = params;

  // Calculate debt service
  const debtSchedule = calculateAmortizingSchedule(loanPrincipal, loanRate, loanYears);
  
  // Equity invested = equity portion + bridge financing costs
  const equityAmount = totalCapex * (equityPct / 100);
  const netEquityInvested = equityAmount + bridgeFinancingCost;

  const schedule: ProFormaYear[] = [];
  let cumulativeCash = -netEquityInvested;

  // Year 0: initial investment
  schedule.push({
    year: 0,
    energySavings: 0,
    carbonAvoidance: 0,
    solarRevenue: 0,
    submeteringNOI: 0,
    totalSavings: 0,
    debtService: 0,
    netCashflow: -netEquityInvested,
    cumulativeCash,
    ctItcRefund: 0,
    discountFactor: 1,
    presentValue: -netEquityInvested,
  });

  let npvSum = -netEquityInvested;

  for (let y = 1; y <= projectionYears; y++) {
    // Energy savings escalate
    const escalatedEnergySavings = annualEnergySavings * Math.pow(1 + energyEscalation, y - 1);
    
    // Carbon avoidance uses actual schedule
    const yearCarbonPrice = getCarbonPriceForYear(startYear + y, province);
    const carbonAvoidance = annualGasSavingsM3 * NG_EMISSION_FACTOR_T_PER_M3 * yearCarbonPrice;
    
    // Solar revenue (slight degradation)
    const solarDegradation = Math.pow(0.995, y - 1); // 0.5%/yr panel degradation
    const solarRev = solarAnnualRevenue * solarDegradation;
    
    // Submetering NOI
    const subNOI = submeteringAnnualNOI * Math.pow(1 + 0.02, y - 1); // 2% rent escalation
    
    const totalSavings = escalatedEnergySavings + carbonAvoidance + solarRev + subNOI;
    
    // Debt service (0 after amortization period)
    const debtService = y <= loanYears ? debtSchedule.annualPayment : 0;
    
    // CT ITC refund arrives in Year 1
    const ctItcRefund = y === 1 ? ctItcAmount : 0;
    
    const netCashflow = totalSavings - debtService + ctItcRefund;
    cumulativeCash += netCashflow;

    const discountFactor = 1 / Math.pow(1 + discountRate, y);
    const presentValue = netCashflow * discountFactor;
    npvSum += presentValue;

    schedule.push({
      year: y,
      energySavings: Math.round(escalatedEnergySavings),
      carbonAvoidance: Math.round(carbonAvoidance),
      solarRevenue: Math.round(solarRev),
      submeteringNOI: Math.round(subNOI),
      totalSavings: Math.round(totalSavings),
      debtService: Math.round(debtService),
      netCashflow: Math.round(netCashflow),
      cumulativeCash: Math.round(cumulativeCash),
      ctItcRefund: Math.round(ctItcRefund),
      discountFactor: Math.round(discountFactor * 10000) / 10000,
      presentValue: Math.round(presentValue),
    });
  }

  // Payback year
  let paybackYear = 0;
  for (const row of schedule) {
    if (row.cumulativeCash >= 0 && row.year > 0) {
      paybackYear = row.year;
      break;
    }
  }
  if (paybackYear === 0) paybackYear = projectionYears + 1; // Never pays back

  // IRR calculation (Newton's method approximation)
  const irr = calculateIRR(schedule.map(r => r.netCashflow));

  // Asset value increase
  const steadyStateNOI = annualEnergySavings + solarAnnualRevenue + submeteringAnnualNOI;
  const assetValueIncrease = steadyStateNOI / capRate;

  // ROI multiple
  const totalCashGenerated = schedule.reduce((s, r) => s + Math.max(0, r.netCashflow), 0);
  const roiMultiple = netEquityInvested > 0 ? totalCashGenerated / netEquityInvested : 0;

  return {
    schedule,
    npv: Math.round(npvSum),
    irr,
    paybackYear,
    assetValueIncrease: Math.round(assetValueIncrease),
    roiMultiple: Math.round(roiMultiple * 100) / 100,
  };
}


// ========================================
// NPV SENSITIVITY
// ========================================

export function calculateNpvSensitivity(
  cashflows: number[], // Year 0 through Year N
  rates: number[] = [0.05, 0.06, 0.075, 0.08, 0.09, 0.10]
): { rate: number; npv: number }[] {
  return rates.map(rate => {
    let npv = 0;
    for (let i = 0; i < cashflows.length; i++) {
      npv += cashflows[i] / Math.pow(1 + rate, i);
    }
    return { rate, npv: Math.round(npv) };
  });
}


// ========================================
// IRR CALCULATOR (Newton's Method)
// ========================================

function calculateIRR(cashflows: number[], guess: number = 0.10, maxIterations: number = 100, tolerance: number = 0.0001): number {
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0; // derivative

    for (let t = 0; t < cashflows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += cashflows[t] / denom;
      if (t > 0) {
        dnpv -= t * cashflows[t] / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < tolerance) break;
    if (dnpv === 0) break;

    rate = rate - npv / dnpv;

    // Sanity bounds
    if (rate < -0.5) rate = -0.5;
    if (rate > 5) rate = 5;
  }

  return Math.round(rate * 1000) / 1000; // 3 decimal places (e.g., 0.142 = 14.2%)
}


// ========================================
// UTILITY HELPERS
// ========================================

export function formatCurrency(num: number, precision: number = 0): string {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (absNum >= 1_000_000) return `${sign}$${(absNum / 1_000_000).toFixed(precision > 0 ? precision : 1)}M`;
  if (absNum >= 1_000) return `${sign}$${(absNum / 1_000).toFixed(0)}k`;
  return `${sign}$${Math.round(absNum).toLocaleString()}`;
}

export function formatPercent(decimal: number, digits: number = 1): string {
  return `${(decimal * 100).toFixed(digits)}%`;
}
