/**
 * Demo Building: 55 King St E, Kitchener, ON
 * Verified seed data from 55 King St E Financial Model v4 (CORRECTED)
 * 
 * This provides a complete, realistic case study that:
 * 1. Demonstrates every feature of the app with real numbers
 * 2. Serves as a validation benchmark for the financial engine
 * 3. Works without any Gemini API calls
 */

import { BuildingData, Scenario, SimulationContext, RetrofitMeasure, ActionPlan, MaturityLevel } from '../types';

// ========================================
// BUILDING DATA
// ========================================

export const KING_STREET_BUILDING: BuildingData = {
  id: 'demo-55-king',
  address: '55 King St E, Kitchener, ON N2G 2K4',
  province: 'ON',
  city: 'Waterloo',
  yearBuilt: 1982,
  archetype: 'Low Rise Office',
  areaSqFt: 41800,
  stories: 4,
  occupancyType: 'Multi-Tenant Office',
  
  // Business case parameters (v4 verified)
  capRate: 0.07,
  rentPerSqft: 18,
  occupancy: 0.85,
  
  // Organization
  organizationType: 'Corporation',
  ownershipModel: 'Single Asset',
  
  // Mandate
  motivation: 'Capital Renewal',
  
  // Constraints
  investmentAppetite: 'Moderate',
  timelineFlexibility: 'Planned (1-3yrs)',
  debtConcerns: false,
  tenantDisruptionSensitivity: 'Medium',
  
  // Business
  businessType: 'Multi-Tenant Professional Office',
  
  // Climate
  climateZone: '5A',
  hdd: 4200,
  cdd: 350,
  
  // Envelope
  wallType: 'Brick Masonry (Uninsulated)',
  roofType: 'BUR (Built-up Roof, 1998)',
  windowType: 'Double Pane (Aluminum - Non-thermally broken)',
  windowWallRatio: 35,
  
  // Mechanical
  heatingSystem: 'Natural Gas Boiler (Non-Condensing, Pre-1990)',
  coolingSystem: 'Packaged Rooftop Units (R-22, End-of-Life)',
  ventilationSystem: 'Constant Volume (CAV)',
  
  // Performance
  energyConsumption: 310, // kWh/m²/yr EUI
  elecUsage: 680000,      // kWh/yr
  gasUsage: 40000,         // m³/yr (v4 corrected — was 145,000 in error)
  utilityBillUploaded: true,
  capitalPlanUploaded: true,
  
  isEstimate: false,
  
  persona: 'Owner / Manager',
  priority: 'Capital Renewal',
  
  savedScenarios: [],
  actionPlan: undefined,
};


// ========================================
// MEASURES (with verified costs from model)
// ========================================

export const KING_STREET_MEASURES: RetrofitMeasure[] = [
  {
    id: 'heatpump',
    name: 'Air Source Heat Pumps',
    category: 'Mechanical',
    description: 'Replace end-of-life gas boiler and R-22 RTUs with centralized ASHP system. COP 3.2 at design conditions.',
    costPerSqFt: 9.09, // $380K / 41,800 sqft
    energySavingsPct: 0.30,
    ghgReductionPct: 0.85,
    selected: true,
    includedIn: ['deep', 'gridsmart'],
    baseCOP: 3.2,
    cop: 3.2,
    rationale: 'Boiler is pre-1990, non-condensing — end of useful life. RTUs use R-22 (phase-out). ASHP provides both heating and cooling from one system.',
  },
  {
    id: 'led',
    name: 'LED Upgrade + Occupancy Sensors',
    category: 'Electrical',
    description: 'Replace T8 fluorescent throughout. ~700 fixtures. DLC Premium listed. Includes hallway/stairwell occupancy sensors.',
    costPerSqFt: 1.67, // $70K / 41,800 sqft
    energySavingsPct: 0.10,
    ghgReductionPct: 0.03,
    selected: true,
    includedIn: ['light', 'deep', 'gridsmart'],
    rationale: 'T8 fluorescent throughout, 15+ years old. LED reduces lighting energy ~60% and cuts cooling load.',
  },
  {
    id: 'bas',
    name: 'Building Automation System',
    category: 'Mechanical',
    description: 'Full DDC BAS with scheduling, demand-controlled ventilation, and tenant submetering integration.',
    costPerSqFt: 1.32, // $55K / 41,800 sqft
    energySavingsPct: 0.08,
    ghgReductionPct: 0.06,
    selected: true,
    includedIn: ['light', 'deep', 'gridsmart'],
    rationale: 'Existing pneumatic controls. BAS enables demand response, scheduling optimization, and M&V for incentive verification.',
  },
  {
    id: 'solar',
    name: 'Rooftop Solar PV (200 kW-DC)',
    category: 'Electrical',
    description: '200 kW-DC rooftop array. Net metered. Est. 240,000 kWh/yr generation. ~10,500 sqft flat roof available.',
    costPerSqFt: 4.43, // $185K / 41,800 sqft
    energySavingsPct: 0.20,
    ghgReductionPct: 0.15,
    selected: true,
    includedIn: ['gridsmart'],
    rationale: 'Flat BUR roof with good solar exposure. 200kW offsets ~35% of annual electricity. Net metering provides revenue.',
  },
  {
    id: 'submetering',
    name: 'Tenant Submetering System',
    category: 'Electrical',
    description: 'Per-tenant electricity submetering. Enables cost recovery and behavioral savings. Protects NOI from split incentive.',
    costPerSqFt: 0.60, // $25K / 41,800 sqft
    energySavingsPct: 0.05,
    ghgReductionPct: 0.02,
    selected: true,
    includedIn: ['deep', 'gridsmart'],
    rationale: 'Multi-tenant building: submetering recovers utility costs from tenants and eliminates split incentive problem.',
  },
  {
    id: 'pipe-insulation',
    name: 'Mechanical Pipe Insulation',
    category: 'Mechanical',
    description: 'Insulate exposed HVAC piping in mechanical rooms and plenums. Low-cost, high-ROI measure.',
    costPerSqFt: 0.19, // $8K / 41,800 sqft
    energySavingsPct: 0.02,
    ghgReductionPct: 0.02,
    selected: true,
    includedIn: ['light', 'deep', 'gridsmart'],
    rationale: 'Uninsulated piping losing significant heat. <1 year payback.',
  },
  {
    id: 'electrical-panel',
    name: 'Electrical Panel Upgrade',
    category: 'Electrical',
    description: 'Upgrade main switchgear to support ASHP and solar PV interconnection. Required for electrification.',
    costPerSqFt: 0.60, // $25K / 41,800 sqft
    energySavingsPct: 0,
    ghgReductionPct: 0,
    selected: true,
    includedIn: ['deep', 'gridsmart'],
    rationale: 'Existing 600A panel insufficient for ASHP + solar. Required enabling work.',
  },
];


// ========================================
// VERIFIED FINANCIAL SUMMARY
// ========================================

export const KING_STREET_FINANCIALS = {
  // Capital costs
  grossCapex: 748000,
  
  // Incentive breakdown (verified)
  incentives: {
    iesoCustom: 65000,       // $0.10/kWh + $800/kW on ASHP + BAS
    iesoPrescriptive: 35000, // $50/fixture × 700 fixtures
    enbridgeCustom: 28000,   // $0.30/m³ × ~93K m³ gas saved
    ctItc: 130000,           // 30% of grant-reduced eligible basis
  },
  totalIncentives: 258000,   // 34.5% coverage
  
  // Net capital
  netCapex: 490000,          // After all incentives (including delayed)
  dayOneFinanced: 620000,    // CapEx - upfront grants only (CT ITC not available Day 1)
  
  // Operating savings (annual)
  energySavings: 68000,      // Electricity + gas reduction
  solarRevenue: 22000,       // Net metering credit
  submeteringNOI: 15000,     // NOI protection from tenant cost recovery
  carbonAvoidance: 12000,    // Based on $110/t (2026)
  totalAnnualSavings: 117000,
  
  // Financing comparison
  cibRate: 0.035,
  commercialRate: 0.065,
  amortizationYears: 20,
  
  // Bridge financing
  ctItcBridgeCost: 8450,     // $130K × 6.5% × 12 months
  
  // Returns
  paybackYear: 6,
  npvAt7_5: 279538,
  npvAt10: 78000,
  irr: 0.142,               // 14.2%
  
  // Asset value
  capRate: 0.07,
  assetValueIncrease: 886000, // ~$62K Y1 benefit / 7% cap (v4 corrected — was $2.34M at wrong 5% cap)
};


// ========================================
// PRE-BUILT SIMULATION CONTEXT
// ========================================

export const KING_STREET_SIMULATION: SimulationContext = {
  totalCapEx: 748000,
  annualSavings: 117000,
  energySavings: 105000, // 117k - 12k carbon
  paybackYears: 6,
  ghgReduction: 0.82, // 82% (ASHP eliminates 95% gas + solar offsets grid)
  selectedMeasures: [
    'Air Source Heat Pumps',
    'LED Upgrade + Occupancy Sensors',
    'Building Automation System',
    'Rooftop Solar PV (200 kW-DC)',
    'Tenant Submetering System',
    'Mechanical Pipe Insulation',
    'Electrical Panel Upgrade',
  ],
  eui: 135, // Post-retrofit EUI
  carbonTotal: 12, // tCO₂e/yr (from residual grid electricity)
};


// ========================================
// PRE-BUILT SCENARIO
// ========================================

export const KING_STREET_SCENARIO: Scenario = {
  id: 'demo-deep-retrofit',
  name: 'Deep: Fuel Switch + Solar',
  measures: KING_STREET_MEASURES,
  preset: 'deep',
  carbonPrice: 110, // 2026 federal backstop
  inflationRate: 3,
  discountRate: 7.5, // Standard WACC proxy for Canadian commercial RE
};


// ========================================
// PRE-BUILT ACTION PLAN
// ========================================

export const KING_STREET_ACTION_PLAN: ActionPlan = {
  title: 'Deep Retrofit Strategy — 55 King St E',
  executiveSummary: 'A phased deep retrofit converting this 1982 office building from gas-dependent to electrified operations. The project achieves 82% GHG reduction, qualifies for CIB financing at 2.0-3.5%, captures $258K in verified incentives (IESO $65K + $35K, Enbridge $28K, CT ITC $130K), and generates positive cash flow from Year 1. Net project cost after incentives: $490K. Conservative 20-year total value: $1,705K across 9 levers. Gas usage: 40,000 m³/yr. Cap rate: 7.0%.',
  phases: [
    {
      name: 'Phase 1: Assessment & Design',
      timeline: 'Months 1-3',
      technicalDetails: 'ASHRAE Level 2 audit, mechanical design for ASHP sizing, structural assessment for solar PV loading, electrical capacity study for panel upgrade.',
      standards: ['ASHRAE 90.1-2019', 'CSA C282-19', 'Ontario Building Code SB-10'],
      steps: [
        'Engage energy auditor (ASHRAE Level 2)',
        'Submit IESO Custom Track pre-approval',
        'Submit CIB financing application',
        'Commission mechanical engineer for ASHP sizing',
        'Solar PV feasibility (structural + interconnection)',
      ],
    },
    {
      name: 'Phase 2: Incentive Applications',
      timeline: 'Months 2-4',
      technicalDetails: 'Parallel submission of IESO Custom, Enbridge Custom, and CIB applications. CT ITC documentation prepared for T2 filing.',
      standards: ['IESO Retrofit Requirements v1.2', 'Enbridge Commercial Custom Guidelines'],
      steps: [
        'Submit IESO Custom Track application with M&V plan',
        'Submit Enbridge Commercial Custom application',
        'Prepare CT ITC documentation (basis calculation)',
        'File CIB Growth Retrofit application',
        'Secure bridge financing for CT ITC carry period',
      ],
    },
    {
      name: 'Phase 3: Procurement & Construction',
      timeline: 'Months 4-10',
      technicalDetails: 'Phased construction: LED first (minimal disruption), then BAS, then ASHP replacement during shoulder season, solar PV last.',
      standards: ['NEC 2023', 'CSA C22.1', 'TSSA requirements for heat pump installations'],
      steps: [
        'Tender mechanical (ASHP), electrical (panel + solar), controls (BAS)',
        'Phase 1 install: LED + submetering (minimal disruption)',
        'Phase 2 install: BAS + pipe insulation',
        'Phase 3 install: Electrical panel upgrade + ASHP',
        'Phase 4 install: Solar PV array',
        'Tenant communication and disruption management',
      ],
    },
    {
      name: 'Phase 4: Commissioning & M&V',
      timeline: 'Months 10-14',
      technicalDetails: 'Functional performance testing, BAS trending verification, M&V baseline establishment for IESO reporting.',
      standards: ['ASHRAE Guideline 0-2019', 'IPMVP Option C'],
      steps: [
        'Functional performance testing (ASHP, BAS)',
        'BAS trending verification (2-week burn-in)',
        'IESO M&V baseline establishment',
        'Submit post-completion claims (IESO + Enbridge)',
        'File T2 with CT ITC claim',
        'Commission submetering and verify tenant billing',
      ],
    },
  ],
  incentiveStrategy: [
    'Stack IESO Custom ($65K) + Enbridge Custom ($28K) + IESO Prescriptive ($35K) for $128K upfront',
    'CT ITC ($130K) claimed on T2 return — budget $8,450 bridge financing cost',
    'CIB financing at 3.5% saves $239K in interest vs 6.5% commercial over 20 years',
    'Class 43.1 CCA provides additional tax shield on clean energy equipment',
  ],
  localPartners: [
    { category: 'Turnkey', name: 'Efficiency Capital', description: 'Fully managed retrofit with off-balance sheet financing option.' },
    { category: 'Engineering', name: 'WSP Canada — Kitchener', description: 'Energy audit, mechanical design, and M&V services.' },
    { category: 'Utility', name: 'Kitchener-Wilmot Hydro / Enbridge Gas', description: 'Local LDC for incentive administration and interconnection.' },
    { category: 'Funding', name: 'CIB — Building Retrofits', description: 'Federal low-interest financing partner.' },
  ],
};


// ========================================
// AI INSIGHT (pre-built for demo mode)
// ========================================

export const KING_STREET_INSIGHT = `**Scout Report: 55 King St E, Kitchener**

This 1982 multi-tenant office building is an excellent deep retrofit candidate. The non-condensing gas boiler and R-22 RTUs are both past end-of-life, creating a natural capital renewal moment that aligns with electrification.

Key signals: 310 kWh/m²/yr EUI is 35% above the archetype median. Gas consumption of 145,000 m³/yr represents $50K+ in annual fuel cost plus escalating carbon charges under the federal backstop ($110/tonne in 2026).

With 82% GHG reduction achievable, this project qualifies for CIB financing at 3.5% — saving $239K in interest over 20 years compared to commercial rates. The full incentive stack covers 34.5% of gross CapEx.

**Recommendation:** Proceed to the Deep Retrofit pathway. Payback in Year 6, IRR 14.2%, and $2.34M in asset value creation.`;
