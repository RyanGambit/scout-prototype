/**
 * Scout Incentive Engine — Real Ontario + Federal Programs
 * Source: Scout Full Dataset v6 (27 programs, verified February 2026)
 *
 * KEY v3 CORRECTIONS FROM v2:
 * - 27 real programs (was 14)
 * - IESO Custom rate corrected: $0.20/kWh + $1,800/kW (was $0.10/$800)
 * - Enbridge Custom rate corrected: $0.25/m³ first 400K (was $0.30)
 * - Added: Small Business, EBCx, Instant Discounts, XLerate, Enbridge DCV/DDP/P4P,
 *   CE ITC, CIB Public, CMHC MLI Select, NRCan ISO 50001, BDC Green,
 *   Toronto ERL, ZEVIP, ChargeON, W.E.T., Toronto Capacity Buyback, GIFMP, FCM GMF
 * - CT ITC basis reduction: grants on same equipment reduce eligible base
 * - LED costs NOT eligible for CT ITC (lighting excluded from clean tech)
 * - Carbon charge eliminated April 2025 — no forward carbon cost in financials
 * - Class 43.2 expired → Class 43.1 at 30% declining balance
 */

export interface Incentive {
  id: string;
  programNumber: number;
  name: string;
  amount: number;
  type: 'Grant' | 'Loan' | 'Rebate' | 'Tax Credit' | 'Tax Shield' | 'Financing' | 'Free Service';
  description: string;
  trigger: string;
  region: 'Federal' | 'Provincial' | 'Municipal' | 'Utility' | 'Private';
  applicableProvinces?: string[];
  applicableCities?: string[];
  minGhgPct?: number;
  isPercent?: boolean;
  percent?: number;
  timing: 'upfront' | 'post-completion' | 'tax-filing' | 'ongoing' | 'point-of-sale';
  claimDelay?: number;
  complexity: 'low' | 'medium' | 'high';
  stackable: boolean;
  stacksWith?: string;
  equipmentTarget?: string[];
  rateType?: 'per-kwh' | 'per-kw' | 'per-fixture' | 'per-m3' | 'percent' | 'flat' | 'per-port' | 'per-litre-day';
  rateValue?: number;
  rateUnit?: string;
  maxAmount?: number;
  programUrl?: string;
  expiryDate?: string;
  notes?: string;
  intakeStatus?: 'open' | 'confirm' | 'closed' | 'seasonal';
  sectorRestriction?: 'private' | 'mush' | 'industrial' | 'municipal' | 'all';
  minElecKwh?: number;
}

export const INCENTIVES: Incentive[] = [
  // ========================================
  // SECTION 1: IESO SAVE ON ENERGY PROGRAMS
  // ========================================
  {
    id: 'ieso-custom',
    programNumber: 1,
    name: 'IESO Retrofit — Custom Stream',
    amount: 0,
    type: 'Grant',
    description: '$0.20/kWh saved + $1,800/kW demand reduced (whichever greater). Up to 50% of eligible costs. Pre-approval required before any PO.',
    trigger: 'Heat Pump',
    region: 'Provincial',
    applicableProvinces: ['ON'],
    timing: 'post-completion',
    claimDelay: 14,
    complexity: 'high',
    stackable: true,
    stacksWith: 'Stacks with Enbridge (diff fuel), CT ITC, CIB',
    equipmentTarget: ['heatpump', 'bas', 'solar'],
    rateType: 'per-kwh',
    rateValue: 0.20,
    rateUnit: '$0.20/kWh OR $1,800/kW (greater)',
    programUrl: 'saveonenergy.ca/For-Business-and-Industry/Programs-and-incentives/Retrofit-Program',
    notes: 'Pre-approval BEFORE any purchase orders. Review 4-8 weeks. Contact retrofit@ieso.ca',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'ieso-prescriptive',
    programNumber: 2,
    name: 'IESO Retrofit — Prescriptive Stream',
    amount: 0,
    type: 'Grant',
    description: 'LED ~$40-60/fixture, solar PV $860/kW-AC (10kW-1MW), VFDs $100-400/unit. No M&V. DLC Premium listing required for lighting.',
    trigger: 'LED',
    region: 'Provincial',
    applicableProvinces: ['ON'],
    timing: 'post-completion',
    claimDelay: 3,
    complexity: 'low',
    stackable: true,
    stacksWith: 'Combine Custom + Prescriptive as Combination Project',
    equipmentTarget: ['led', 'solar'],
    rateType: 'per-fixture',
    rateValue: 50,
    rateUnit: '~$50/fixture LED or $860/kW-AC solar',
    maxAmount: 1000000,
    programUrl: 'saveonenergy.ca/For-Business-and-Industry/Programs-and-incentives/Retrofit-Program',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'ieso-small-business',
    programNumber: 3,
    name: 'IESO Small Business Program',
    amount: 0,
    type: 'Free Service',
    description: 'Up to $3,000 lighting + $2,500 non-lighting direct install. DCKV joint: up to $26,500 w/ Enbridge. No paperwork.',
    trigger: 'LED',
    region: 'Provincial',
    applicableProvinces: ['ON'],
    timing: 'upfront',
    claimDelay: 0,
    complexity: 'low',
    stackable: true,
    stacksWith: 'Enbridge Small Business co-delivered',
    equipmentTarget: ['led'],
    rateType: 'flat',
    rateValue: 3000,
    rateUnit: 'Up to $3K lighting + $2.5K non-lighting',
    maxAmount: 5500,
    notes: 'Annual electricity <250,000 kWh/yr. Free on-site assessment.',
    intakeStatus: 'open',
    sectorRestriction: 'all',
    minElecKwh: 0,
  },
  {
    id: 'ieso-ebcx',
    programNumber: 4,
    name: 'IESO Existing Building Commissioning (EBCx)',
    amount: 0,
    type: 'Grant',
    description: 'Up to $150,000/facility (phased: Investigation, Implementation, Persistence). Ideal precursor to Retrofit Program.',
    trigger: 'BAS',
    region: 'Provincial',
    applicableProvinces: ['ON'],
    timing: 'post-completion',
    claimDelay: 6,
    complexity: 'medium',
    stackable: true,
    stacksWith: 'Precursor to Retrofit Program',
    equipmentTarget: ['bas'],
    rateType: 'flat',
    maxAmount: 150000,
    notes: 'Min 750,000 kWh/yr. Contact IESO before engaging commissioning provider.',
    intakeStatus: 'open',
    sectorRestriction: 'all',
    minElecKwh: 750000,
  },
  {
    id: 'ieso-epp',
    programNumber: 5,
    name: 'IESO Energy Performance Program (EPP)',
    amount: 0,
    type: 'Grant',
    description: '$0.30/kWh summer peak + $0.08/kWh non-summer. Rates doubled Jan 2025. Multi-year pay-for-performance. Min 5% savings.',
    trigger: 'All',
    region: 'Provincial',
    applicableProvinces: ['ON'],
    timing: 'ongoing',
    claimDelay: 18,
    complexity: 'high',
    stackable: false,
    stacksWith: 'Typically mutually exclusive with Retrofit for same measures',
    equipmentTarget: [],
    rateType: 'per-kwh',
    rateValue: 0.30,
    rateUnit: '$0.30/kWh summer + $0.08/kWh non-summer',
    notes: 'Min 1,500,000 kWh/yr. 3-year commitment. Confirm current intake with IESO.',
    intakeStatus: 'confirm',
    sectorRestriction: 'all',
    minElecKwh: 1500000,
  },
  {
    id: 'ieso-instant-discounts',
    programNumber: 6,
    name: 'IESO Instant Discounts — Lighting',
    amount: 0,
    type: 'Rebate',
    description: 'Point-of-sale LED discount: high bay up to $140, troffers $30-75, strips $20-50. Zero paperwork.',
    trigger: 'LED',
    region: 'Provincial',
    applicableProvinces: ['ON'],
    timing: 'point-of-sale',
    claimDelay: 0,
    complexity: 'low',
    stackable: true,
    stacksWith: 'Stacks with Retrofit Program for non-overlapping measures',
    equipmentTarget: ['led'],
    rateType: 'per-fixture',
    rateValue: 75,
    rateUnit: '$30-140/fixture at point of sale',
    notes: 'Zero friction. Do NOT overlap with Retrofit for same fixtures.',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'ieso-xlerate',
    programNumber: 7,
    name: 'IESO XLerate (Large Industrial/Institutional)',
    amount: 0,
    type: 'Grant',
    description: 'Up to $15M/project, 75% of costs. $300/MWh verified savings ($450 in constrained areas). Replaces IEEP Nov 2025.',
    trigger: 'All',
    region: 'Provincial',
    applicableProvinces: ['ON'],
    timing: 'post-completion',
    claimDelay: 12,
    complexity: 'high',
    stackable: true,
    stacksWith: 'CT ITC, CIB, Retrofit Program (different measures)',
    equipmentTarget: [],
    rateType: 'per-kwh',
    rateValue: 0.30,
    rateUnit: '$300/MWh ($450 constrained)',
    maxAmount: 15000000,
    notes: 'Min 600 MWh/yr savings. Industrial/institutional process. 5yr completion window.',
    intakeStatus: 'open',
    sectorRestriction: 'industrial',
    minElecKwh: 2000000,
  },

  // ========================================
  // SECTION 2: ENBRIDGE GAS PROGRAMS
  // ========================================
  {
    id: 'enbridge-custom',
    programNumber: 8,
    name: 'Enbridge Commercial Custom Retrofit',
    amount: 0,
    type: 'Rebate',
    description: '$0.25/m³ gas saved (first 400K m³), $0.10/m³ above. Max 50% incremental cost. Pre-approval mandatory.',
    trigger: 'Heat Pump',
    region: 'Utility',
    applicableProvinces: ['ON'],
    timing: 'post-completion',
    claimDelay: 6,
    complexity: 'medium',
    stackable: true,
    stacksWith: 'IESO (diff fuel), CT ITC, CIB',
    equipmentTarget: ['heatpump'],
    rateType: 'per-m3',
    rateValue: 0.25,
    rateUnit: '$0.25/m³ (first 400K), $0.10/m³ above',
    maxAmount: 100000,
    notes: 'Commercial max $100K. Institutional max $500K. Pre-approval BEFORE purchase.',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'enbridge-prescriptive',
    programNumber: 9,
    name: 'Enbridge Prescriptive (DCV + Fixed)',
    amount: 0,
    type: 'Rebate',
    description: 'DCV kitchen hood: $5,000-$12,000. Programmable thermostats: up to $1,000. Fixed per-unit amounts.',
    trigger: 'All',
    region: 'Utility',
    applicableProvinces: ['ON'],
    timing: 'post-completion',
    claimDelay: 4,
    complexity: 'low',
    stackable: true,
    stacksWith: 'IESO, DCV joint w/ IESO Small Business up to $26,500',
    equipmentTarget: [],
    rateType: 'flat',
    notes: 'Get current Prescriptive Worksheet from Enbridge Advisor before purchasing.',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'enbridge-ddp',
    programNumber: 10,
    name: 'Enbridge Distributor Discount (DDP)',
    amount: 0,
    type: 'Rebate',
    description: 'Point-of-sale discount on HVAC & foodservice equipment. Condensing heaters $200-400, tankless $100-250. Zero paperwork.',
    trigger: 'All',
    region: 'Utility',
    applicableProvinces: ['ON'],
    timing: 'point-of-sale',
    claimDelay: 0,
    complexity: 'low',
    stackable: true,
    stacksWith: 'Stacks with Enbridge Custom AND IESO on same equipment',
    equipmentTarget: [],
    rateType: 'flat',
    notes: 'Provide Enbridge gas service address at participating distributor.',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'enbridge-p4p',
    programNumber: 11,
    name: 'Enbridge Pay for Performance (P4P)',
    amount: 0,
    type: 'Grant',
    description: 'Multi-year performance-based gas savings incentive. Free coaching + baseline analysis. Target 20% gas savings over 3 years.',
    trigger: 'All',
    region: 'Utility',
    applicableProvinces: ['ON'],
    timing: 'ongoing',
    claimDelay: 12,
    complexity: 'medium',
    stackable: true,
    stacksWith: 'IESO EPP (gas + electricity pair). NOT with Enbridge Custom simultaneously.',
    equipmentTarget: [],
    rateType: 'per-m3',
    notes: 'Confirm current intake. Gas operational equivalent of IESO EPP.',
    intakeStatus: 'confirm',
    sectorRestriction: 'all',
  },

  // ========================================
  // SECTION 3: FEDERAL CASH PROGRAMS
  // ========================================
  {
    id: 'ct-itc',
    programNumber: 12,
    name: 'Clean Technology ITC (30%)',
    amount: 0,
    type: 'Tax Credit',
    description: '30% REFUNDABLE ITC. Heat pumps, solar, batteries. LED NOT eligible. Basis reduced by grants on same equipment. Claimed on T2.',
    trigger: 'Heat Pump',
    region: 'Federal',
    timing: 'tax-filing',
    claimDelay: 12,
    complexity: 'medium',
    stackable: true,
    stacksWith: 'IESO, Enbridge, CIB, Class 43.1. Grants reduce basis first.',
    isPercent: true,
    percent: 0.30,
    equipmentTarget: ['heatpump', 'solar', 'dhw'],
    rateType: 'percent',
    rateValue: 0.30,
    rateUnit: '30% of grant-reduced eligible basis',
    expiryDate: '2034-12-31',
    notes: 'Taxable corps/REITs ONLY. NOT: individuals, non-profits, Crown corps. Phase-down 2034.',
    intakeStatus: 'open',
    sectorRestriction: 'private',
  },
  {
    id: 'ce-itc',
    programNumber: 13,
    name: 'Clean Electricity ITC (15%)',
    amount: 0,
    type: 'Tax Credit',
    description: '15% refundable ITC for non-taxable entities (municipal corps, Indigenous, pensions). Awaiting Royal Assent Feb 2026.',
    trigger: 'Heat Pump',
    region: 'Federal',
    timing: 'tax-filing',
    claimDelay: 12,
    complexity: 'high',
    stackable: true,
    stacksWith: 'IESO, Enbridge, CIB. Does NOT stack with CT ITC on same property.',
    isPercent: true,
    percent: 0.15,
    equipmentTarget: ['heatpump', 'solar', 'dhw'],
    rateType: 'percent',
    rateValue: 0.15,
    rateUnit: '15% of eligible basis',
    notes: 'AWAITING ROYAL ASSENT. Municipal corps, Indigenous communities, pensions.',
    intakeStatus: 'confirm',
    sectorRestriction: 'mush',
  },
  {
    id: 'class-43-1',
    programNumber: 14,
    name: 'Class 43.1 Accelerated CCA',
    amount: 0,
    type: 'Tax Shield',
    description: '30% declining balance on clean energy equipment. Year-1 incremental saving ~$10-15K on $380K ASHP at 27% tax rate.',
    trigger: 'Heat Pump',
    region: 'Federal',
    timing: 'ongoing',
    complexity: 'low',
    stackable: true,
    stacksWith: 'CT ITC (CCA applied to reduced UCC after ITC)',
    equipmentTarget: ['heatpump', 'solar', 'dhw'],
    rateType: 'percent',
    rateValue: 0.30,
    rateUnit: '30% declining balance CCA (vs 20% Class 8)',
    notes: 'Class 43.2 (50%) expired. Half-year rule in year of acquisition.',
    intakeStatus: 'open',
    sectorRestriction: 'private',
  },
  {
    id: 'cib-private',
    programNumber: 15,
    name: 'CIB Building Retrofits — Private Sector',
    amount: 0,
    type: 'Financing',
    description: 'Sub-commercial rate via Scotiabank/BMO. Min 30% GHG. Interest savings $195K-$282K on $490K over 20yr.',
    trigger: 'Heat Pump',
    region: 'Federal',
    minGhgPct: 0.30,
    timing: 'upfront',
    claimDelay: 2,
    complexity: 'high',
    stackable: true,
    stacksWith: 'All grants and tax credits.',
    equipmentTarget: ['heatpump', 'solar'],
    notes: 'Private sector ONLY. MUSH → use CIB Public (#16). Apply via Scotiabank/BMO or direct CIB.',
    intakeStatus: 'open',
    sectorRestriction: 'private',
  },
  {
    id: 'cib-public',
    programNumber: 16,
    name: 'CIB Public Building Retrofits — MUSH',
    amount: 0,
    type: 'Financing',
    description: 'Direct CIB lending to public entities. No bank intermediary. Repaid from energy savings = zero new budget obligation.',
    trigger: 'Heat Pump',
    region: 'Federal',
    minGhgPct: 0.30,
    timing: 'upfront',
    claimDelay: 2,
    complexity: 'high',
    stackable: true,
    stacksWith: 'CE ITC 15%, FCM GMF, IESO XLerate, Enbridge Custom',
    equipmentTarget: ['heatpump', 'solar'],
    notes: 'Municipalities, school boards, hospitals, universities. Multi-building portfolios preferred.',
    intakeStatus: 'open',
    sectorRestriction: 'mush',
  },
  {
    id: 'efficiency-capital',
    programNumber: 17,
    name: 'Efficiency Capital — Turnkey ESA',
    amount: 0,
    type: 'Financing',
    description: 'Zero upfront cost. Triple risk transfer: technical + performance + financial. Off-balance sheet.',
    trigger: 'All',
    region: 'Private',
    timing: 'upfront',
    complexity: 'medium',
    stackable: true,
    stacksWith: 'EC applies for ALL incentives internally',
    equipmentTarget: [],
    notes: 'Min ~$500K project. Best for capital-constrained owners.',
    intakeStatus: 'open',
    sectorRestriction: 'private',
  },
  {
    id: 'cmhc-mli-select',
    programNumber: 18,
    name: 'CMHC MLI Select',
    amount: 0,
    type: 'Financing',
    description: 'Up to 95% LTV, 50-year amortization. Climate points unlock terms for deep retrofits. Multi-res/mixed-use.',
    trigger: 'Heat Pump',
    region: 'Federal',
    timing: 'upfront',
    complexity: 'high',
    stackable: true,
    stacksWith: 'CT ITC, CIB, IESO, Enbridge',
    equipmentTarget: ['heatpump', 'solar'],
    notes: 'Multi-family residential or mixed-use (residential primary). Apply through CMHC-approved lender.',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'nrcan-iso-50001',
    programNumber: 19,
    name: 'NRCan ISO 50001 Grant',
    amount: 0,
    type: 'Grant',
    description: 'Up to 60% of costs (max $40K/building, $200K/portfolio). Covers energy management system implementation.',
    trigger: 'BAS',
    region: 'Federal',
    timing: 'post-completion',
    claimDelay: 6,
    complexity: 'medium',
    stackable: true,
    stacksWith: 'IESO EBCx → ISO 50001 → EPP sequential stack',
    equipmentTarget: ['bas'],
    rateType: 'percent',
    rateValue: 0.60,
    rateUnit: '60% of costs (75% for non-profits)',
    maxAmount: 40000,
    notes: 'Apply before starting ISO 50001 implementation.',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'bdc-green-loan',
    programNumber: 20,
    name: 'BDC Certified Green Building Loan',
    amount: 0,
    type: 'Financing',
    description: 'Up to 100% project costs. Interest rate discount on green cert. Interest-only first 36mo. Up to 25yr repayment.',
    trigger: 'All',
    region: 'Federal',
    timing: 'upfront',
    complexity: 'medium',
    stackable: true,
    stacksWith: 'IESO, Enbridge, CT ITC, CIB',
    equipmentTarget: [],
    notes: 'Must intend to obtain green certification (BOMA BEST, LEED, etc).',
    intakeStatus: 'open',
    sectorRestriction: 'private',
  },

  // ========================================
  // SECTION 4: SPECIALIST & MUNICIPAL PROGRAMS
  // ========================================
  {
    id: 'toronto-erl',
    programNumber: 21,
    name: 'City of Toronto — Energy Retrofit Loans',
    amount: 0,
    type: 'Financing',
    description: 'Up to 100% of costs. 30yr term. Rate = City borrowing rate (~3.5-4.5%). 1yr interest-free. Unsecured.',
    trigger: 'All',
    region: 'Municipal',
    applicableProvinces: ['ON'],
    applicableCities: ['Toronto'],
    timing: 'upfront',
    complexity: 'medium',
    stackable: true,
    stacksWith: 'IESO, Enbridge, CT ITC, CIB',
    equipmentTarget: [],
    notes: 'Toronto buildings only.',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'zevip',
    programNumber: 22,
    name: 'Federal ZEVIP — EV Charging',
    amount: 0,
    type: 'Grant',
    description: 'Up to 50% of EV charging costs. Max $100K/site for workplaces and MURBs.',
    trigger: 'All',
    region: 'Federal',
    timing: 'post-completion',
    claimDelay: 6,
    complexity: 'medium',
    stackable: true,
    stacksWith: 'ChargeON (provincial), CT ITC on hardware',
    equipmentTarget: [],
    rateType: 'percent',
    rateValue: 0.50,
    rateUnit: '50% of eligible costs',
    maxAmount: 100000,
    notes: 'Apply BEFORE any equipment purchase.',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'chargeon',
    programNumber: 23,
    name: 'Ontario ChargeON — EV Charging',
    amount: 0,
    type: 'Grant',
    description: 'L2: $600-1,500/port. DCFC: up to $5,000/port. Stacks with ZEVIP.',
    trigger: 'All',
    region: 'Provincial',
    applicableProvinces: ['ON'],
    timing: 'post-completion',
    claimDelay: 4,
    complexity: 'medium',
    stackable: true,
    stacksWith: 'ZEVIP (federal). Combined = standard Ontario approach.',
    equipmentTarget: [],
    rateType: 'per-port',
    rateValue: 1000,
    rateUnit: '$600-1,500/L2 port, $5,000/DCFC',
    notes: 'Intake may be between rounds — confirm at chargeonontario.ca.',
    intakeStatus: 'confirm',
    sectorRestriction: 'all',
  },
  {
    id: 'wet-waterloo',
    programNumber: 24,
    name: 'Region of Waterloo — W.E.T. Program',
    amount: 0,
    type: 'Free Service',
    description: '$0.40/litre/day water saved (or less for <2yr payback). 50% cost-share for audits up to $10K. Free fixtures + water-use review.',
    trigger: 'All',
    region: 'Municipal',
    applicableProvinces: ['ON'],
    applicableCities: ['Kitchener', 'Waterloo', 'Cambridge'],
    timing: 'post-completion',
    claimDelay: 24,
    complexity: 'medium',
    stackable: true,
    stacksWith: 'IESO (if water measure has electricity component), Enbridge, CT ITC',
    equipmentTarget: [],
    rateType: 'per-litre-day',
    rateValue: 0.40,
    rateUnit: '$0.40/L/day saved (max 2yr payback cap)',
    notes: 'Region of Waterloo municipal water connection required.',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'toronto-capacity-buyback',
    programNumber: 25,
    name: 'Toronto — ICI Capacity Buyback',
    amount: 0,
    type: 'Free Service',
    description: 'One-time $0.30/litre/day water saved. Free professional water audit included (worth $3-8K). No cap.',
    trigger: 'All',
    region: 'Municipal',
    applicableProvinces: ['ON'],
    applicableCities: ['Toronto'],
    timing: 'post-completion',
    claimDelay: 6,
    complexity: 'low',
    stackable: true,
    stacksWith: 'IESO, Enbridge, CT ITC, Toronto ERL',
    equipmentTarget: [],
    rateType: 'per-litre-day',
    rateValue: 0.30,
    rateUnit: '$0.30/L/day saved',
    notes: 'Toronto only. Free professional engineer water audit included.',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'nrcan-gifmp',
    programNumber: 26,
    name: 'NRCan GIFMP — Green Industrial',
    amount: 0,
    type: 'Grant',
    description: 'Up to 50% costs, max $10M. Industrial facilities only. Competitive intake.',
    trigger: 'All',
    region: 'Federal',
    timing: 'post-completion',
    claimDelay: 12,
    complexity: 'high',
    stackable: true,
    stacksWith: 'IESO XLerate, CT ITC, ISO 50001 grant',
    equipmentTarget: [],
    rateType: 'percent',
    rateValue: 0.50,
    rateUnit: '50% of eligible costs',
    maxAmount: 10000000,
    notes: 'CLOSED — 3rd intake closed Sept 26, 2025. 4th intake not announced.',
    intakeStatus: 'closed',
    sectorRestriction: 'industrial',
  },
  {
    id: 'fcm-gmf',
    programNumber: 27,
    name: 'FCM Green Municipal Fund (GMF)',
    amount: 0,
    type: 'Grant',
    description: 'Study: 50% (max $65K single/$200K multi). Capital: 15% grant + loan up to $10M. Municipal + partners only.',
    trigger: 'All',
    region: 'Federal',
    timing: 'upfront',
    claimDelay: 4,
    complexity: 'medium',
    stackable: true,
    stacksWith: 'CIB Public Retrofits (complementary). FCM for studies + first buildings, CIB for full portfolio.',
    equipmentTarget: [],
    maxAmount: 200000,
    notes: 'Municipalities and formal municipal partners only.',
    intakeStatus: 'open',
    sectorRestriction: 'municipal',
  },

  // ========================================
  // LDC DEMAND RESPONSE
  // ========================================
  {
    id: 'ldc-demand-response',
    programNumber: 0,
    name: 'LDC Demand Response',
    amount: 0,
    type: 'Rebate',
    description: '~$200/kW curtailed annually. Requires BAS with load shedding capability.',
    trigger: 'BAS',
    region: 'Utility',
    applicableProvinces: ['ON'],
    timing: 'ongoing',
    complexity: 'medium',
    stackable: true,
    equipmentTarget: ['bas'],
    rateType: 'per-kw',
    rateValue: 200,
    rateUnit: '$/kW/yr curtailed',
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },

  // ========================================
  // PROVINCIAL (Non-Ontario) — Retained from v2
  // ========================================
  {
    id: 'cleanbc-better-buildings',
    programNumber: 0,
    name: 'CleanBC Better Buildings',
    amount: 0,
    type: 'Rebate',
    description: 'BC incentives for envelope and HVAC upgrades in commercial buildings.',
    trigger: 'Heat Pump',
    region: 'Provincial',
    applicableProvinces: ['BC'],
    timing: 'post-completion',
    claimDelay: 4,
    complexity: 'medium',
    stackable: true,
    equipmentTarget: ['heatpump', 'windows', 'insulation'],
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'teq-ecoperformance',
    programNumber: 0,
    name: 'TEQ EcoPerformance',
    amount: 0,
    type: 'Rebate',
    description: 'Quebec grants for commercial energy efficiency and GHG reduction.',
    trigger: 'Heat Pump',
    region: 'Provincial',
    applicableProvinces: ['QC'],
    timing: 'post-completion',
    claimDelay: 6,
    complexity: 'high',
    stackable: true,
    equipmentTarget: ['heatpump', 'bas'],
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
  {
    id: 'era-funding',
    programNumber: 0,
    name: 'Emissions Reduction Alberta',
    amount: 0,
    type: 'Grant',
    description: 'Technology deployment funding for emissions reduction in Alberta.',
    trigger: 'Heat Pump',
    region: 'Provincial',
    applicableProvinces: ['AB'],
    timing: 'upfront',
    claimDelay: 8,
    complexity: 'high',
    stackable: true,
    equipmentTarget: ['heatpump', 'solar'],
    intakeStatus: 'open',
    sectorRestriction: 'all',
  },
];


// ========================================
// INCENTIVE STACKING ENGINE
// ========================================

export interface IncentiveStackResult {
  eligibleIncentives: EligibleIncentive[];
  totalUpfront: number;
  totalDelayed: number;
  totalGrants: number;
  ctItcAmount: number;
  ctItcBasis: number;
  bridgeFinancingTotal: number;
  dayOneFinancedAmount: number;
  netCapex: number;
  incentiveCoverage: number;
  cibEligible: boolean;
}

export interface EligibleIncentive {
  incentive: Incentive;
  amount: number;
  eligible: boolean;
  reason: string;
  timing: string;
}

export interface MeasureCostInput {
  id: string;
  name: string;
  cost: number;
  category: string;
  kwhSaved?: number;
  kwDemandReduced?: number;
  m3GasSaved?: number;
  fixtureCount?: number;
  kwSolar?: number;
}

export function calculateIncentiveStack(params: {
  measures: MeasureCostInput[];
  grossCapex: number;
  province: string;
  ghgReduction: number;
  organizationType?: string;
  commercialRate?: number;
  annualGasSavingsM3?: number;
  annualElecSavingsKwh?: number;
  city?: string;
  annualElecKwh?: number;
}): IncentiveStackResult {
  const {
    measures = [], grossCapex, province, ghgReduction,
    organizationType, commercialRate = 0.065,
    annualGasSavingsM3 = 0, annualElecSavingsKwh = 0,
    city, annualElecKwh = 0,
  } = params;

  const eligibleIncentives: EligibleIncentive[] = [];
  const grantsByEquipment: Record<string, number> = {};
  const getMeasureCost = (id: string) => measures.find(m => m.id === id)?.cost || 0;
  const hasMeasure = (id: string) => measures.some(m => m.id === id);
  const isMUSH = ['Municipality', 'Non-Profit'].includes(organizationType || '');
  const isPrivateCorp = ['Corporation', 'REIT', 'Private Owner'].includes(organizationType || '');

  let totalUpfront = 0;
  let totalDelayed = 0;
  let ctItcAmount = 0;
  let ctItcBasis = 0;

  for (const inc of INCENTIVES) {
    // Province filter
    if (inc.applicableProvinces && !inc.applicableProvinces.includes(province)) continue;

    // City filter
    if (inc.applicableCities && city && !inc.applicableCities.includes(city)) continue;
    if (inc.applicableCities && !city) continue;

    let amount = 0;
    let eligible = true;
    let reason = 'Eligible';

    // GHG threshold check
    if (inc.minGhgPct && ghgReduction < inc.minGhgPct) {
      eligible = false;
      reason = `Requires >= ${(inc.minGhgPct * 100).toFixed(0)}% GHG (project: ${(ghgReduction * 100).toFixed(0)}%)`;
    }

    // Sector restriction checks
    if (inc.sectorRestriction === 'mush' && !isMUSH) {
      eligible = false;
      reason = 'MUSH sector only';
    }
    if (inc.sectorRestriction === 'municipal' && organizationType !== 'Municipality') {
      eligible = false;
      reason = 'Municipal sector only';
    }
    if (inc.sectorRestriction === 'private' && isMUSH) {
      eligible = false;
      reason = 'Private sector / taxable corporations only';
    }
    if (inc.sectorRestriction === 'industrial') {
      eligible = false;
      reason = 'Industrial facilities only';
    }

    // Intake status
    if (inc.intakeStatus === 'closed') {
      eligible = false;
      reason = 'Program currently closed — no active intake';
    }

    // Minimum electricity threshold
    if (inc.minElecKwh && annualElecKwh < inc.minElecKwh && annualElecKwh > 0) {
      eligible = false;
      reason = `Min ${(inc.minElecKwh / 1000).toFixed(0)}K kWh/yr required`;
    }

    // Small business max check
    if (inc.id === 'ieso-small-business' && annualElecKwh > 250000) {
      eligible = false;
      reason = 'Max 250,000 kWh/yr for Small Business program';
    }

    // Equipment trigger matching (with alias support)
    if (eligible && inc.trigger !== 'All') {
      const triggerLower = inc.trigger.toLowerCase();
      // Alias map: trigger keywords that should also match
      const TRIGGER_ALIASES: Record<string, string[]> = {
        'heat pump': ['ashp', 'vrf', 'geothermal', 'mini-split', 'minisplit', 'heat pump', 'heatpump', 'air-source', 'ground-source'],
        'led': ['led', 'lighting', 'luminaire', 'troffer', 'high bay', 'highbay'],
        'bas': ['bas', 'bms', 'automation', 'controls', 'commissioning', 'ebcx'],
      };
      const aliases = TRIGGER_ALIASES[triggerLower] || [triggerLower];
      const matched = measures.some(m => {
        const nameLower = m.name.toLowerCase();
        return aliases.some(a => nameLower.includes(a)) ||
          (inc.equipmentTarget || []).includes(m.id);
      });
      if (!matched) { eligible = false; reason = `Requires ${inc.trigger}`; }
    }

    if (eligible) {
      switch (inc.id) {
        case 'ieso-custom': {
          // v4: ASHP + BAS measures. $0.20/kWh saved OR $1,800/kW demand (greater)
          // Excludes LED (goes to Prescriptive). Includes solar in conservative allocation.
          const kwhSaved = measures
            .filter(m => m.id !== 'led')
            .reduce((s, m) => s + (m.kwhSaved || 0), 0);
          const kwReduced = measures
            .filter(m => m.id !== 'led')
            .reduce((s, m) => s + (m.kwDemandReduced || 0), 0);
          amount = Math.max(kwhSaved * 0.20, kwReduced * 1800);
          // Cap at 50% of non-LED eligible costs
          const nonLedCosts = measures.filter(m => m.id !== 'led' && m.id !== 'submetering').reduce((s, m) => s + m.cost, 0);
          amount = Math.min(amount, nonLedCosts * 0.50);
          if (amount === 0 && hasMeasure('heatpump')) amount = grossCapex * 0.087;
          if (amount > 0 && hasMeasure('heatpump'))
            grantsByEquipment['heatpump'] = (grantsByEquipment['heatpump'] || 0) + amount * 0.85;
          break;
        }
        case 'ieso-prescriptive': {
          // v4: LED fixtures ONLY in conservative case.
          // Solar PV Prescriptive ($860/kW-AC) requires IESO confirmation — upside scenario.
          const led = measures.find(m => m.id === 'led');
          const fixtures = led?.fixtureCount || Math.round((led?.cost || 0) / 100);
          amount = fixtures * 50; // LED only — solar excluded from Prescriptive in base case
          break;
        }
        case 'ieso-small-business': {
          amount = Math.min(5500, grossCapex * 0.05);
          break;
        }
        case 'ieso-ebcx': {
          amount = Math.min(150000, grossCapex * 0.10);
          break;
        }
        case 'ieso-epp': {
          if (annualElecSavingsKwh > 0) amount = annualElecSavingsKwh * 0.30;
          if (eligibleIncentives.some(e => e.incentive.id === 'ieso-custom' && e.eligible && e.amount > 0)) {
            eligible = false;
            reason = 'Mutually exclusive with IESO Custom for same measures';
          }
          break;
        }
        case 'ieso-instant-discounts': {
          // Mutual exclusion: if Prescriptive already claims LED, Instant Discounts should NOT
          // also claim the same fixtures. Use one or the other (Prescriptive is typically higher value).
          const prescriptiveClaimed = eligibleIncentives.some(
            e => e.incentive.id === 'ieso-prescriptive' && e.eligible && e.amount > 0
          );
          if (prescriptiveClaimed) {
            eligible = false;
            reason = 'LED already claimed via Prescriptive — do not double-count';
          } else {
            const led = measures.find(m => m.id === 'led');
            const fixtures = led?.fixtureCount || Math.round((led?.cost || 0) / 100);
            amount = fixtures * 75;
          }
          break;
        }
        case 'ieso-xlerate': {
          if (annualElecSavingsKwh >= 600000) {
            amount = (annualElecSavingsKwh / 1000) * 300;
          } else {
            eligible = false;
            reason = 'Min 600 MWh/yr savings required';
          }
          break;
        }
        case 'enbridge-custom': {
          // v4: Use HIGHER of per-m³ savings calculation vs fallback formula.
          // Enbridge Custom often uses internal engineering factors for deep retrofits.
          let rateAmount = 0;
          if (annualGasSavingsM3 > 0) {
            const first400k = Math.min(annualGasSavingsM3, 400000);
            const above400k = Math.max(0, annualGasSavingsM3 - 400000);
            rateAmount = (first400k * 0.25) + (above400k * 0.10);
          }
          const fallbackAmount = hasMeasure('heatpump') ? grossCapex * 0.037 : 0;
          amount = Math.max(rateAmount, fallbackAmount);
          if (amount > 0 && hasMeasure('heatpump'))
            grantsByEquipment['heatpump'] = (grantsByEquipment['heatpump'] || 0) + amount;
          break;
        }
        case 'enbridge-prescriptive':
        case 'enbridge-ddp':
        case 'enbridge-p4p': {
          amount = 0; // Variable / point-of-sale / performance-based
          break;
        }
        case 'ct-itc': {
          if (!isPrivateCorp) {
            eligible = false;
            reason = 'Taxable corporations and REITs only';
          } else {
            // v4 corrected: CT ITC eligible basis excludes LED costs entirely.
            // Grants are pro-rated to eligible equipment only.
            const ctEligible = ['heatpump', 'solar', 'dhw'];
            let equipmentTotal = 0;
            let totalProjectCost = 0;
            
            for (const m of measures) {
              totalProjectCost += m.cost || 0;
              if (ctEligible.includes(m.id)) {
                equipmentTotal += m.cost || 0;
              }
            }

            // Sum ALL non-tax-credit grants accumulated so far
            const allPriorGrants = eligibleIncentives
              .filter(e => e.eligible && e.amount > 0 &&
                e.incentive.type !== 'Tax Credit' && e.incentive.type !== 'Tax Shield' &&
                e.incentive.type !== 'Financing' && e.incentive.type !== 'Free Service')
              .reduce((s, e) => s + e.amount, 0);

            // Pro-rate grants to eligible equipment
            const proRatedGrants = totalProjectCost > 0 ? allPriorGrants * (equipmentTotal / totalProjectCost) : 0;
            
            const basis = Math.max(0, equipmentTotal - proRatedGrants);
            ctItcBasis = basis;
            amount = Math.round(basis * 0.30);
            ctItcAmount = amount;
          }
          break;
        }
        case 'ce-itc': {
          if (!isMUSH) {
            eligible = false;
            reason = 'Non-taxable entities only';
          } else {
            const ceEligible = ['heatpump', 'solar', 'dhw'];
            let equipmentTotal = 0;
            let totalProjectCost = 0;
            
            for (const m of measures) {
              totalProjectCost += m.cost || 0;
              if (ceEligible.includes(m.id)) {
                equipmentTotal += m.cost || 0;
              }
            }

            const allPriorGrants = eligibleIncentives
              .filter(e => e.eligible && e.amount > 0 &&
                e.incentive.type !== 'Tax Credit' && e.incentive.type !== 'Tax Shield' &&
                e.incentive.type !== 'Financing' && e.incentive.type !== 'Free Service')
              .reduce((s, e) => s + e.amount, 0);

            const proRatedGrants = totalProjectCost > 0 ? allPriorGrants * (equipmentTotal / totalProjectCost) : 0;
            const basis = Math.max(0, equipmentTotal - proRatedGrants);
            amount = Math.round(basis * 0.15);
          }
          break;
        }
        case 'class-43-1': {
          const eqCost = ['heatpump', 'solar', 'dhw'].reduce((s, id) => s + getMeasureCost(id), 0);
          amount = Math.round(eqCost * 0.30 * 0.27 * 0.55);
          break;
        }
        case 'cib-private':
        case 'cib-public':
        case 'efficiency-capital':
        case 'cmhc-mli-select':
        case 'bdc-green-loan':
        case 'toronto-erl': {
          amount = 0; // Financing, not grant
          break;
        }
        case 'fcm-gmf': {
          amount = Math.min(grossCapex * 0.01, inc.maxAmount || 200000);
          break;
        }
        case 'nrcan-iso-50001': {
          amount = hasMeasure('bas') ? Math.min(40000, grossCapex * 0.02) : 0;
          break;
        }
        case 'zevip':
        case 'chargeon':
        case 'wet-waterloo':
        case 'toronto-capacity-buyback':
        case 'nrcan-gifmp': {
          amount = 0; // Specialist / closed programs
          break;
        }
        case 'ldc-demand-response': {
          amount = hasMeasure('bas') ? 10000 : 0;
          break;
        }
        default: {
          if (inc.isPercent && inc.percent) amount = Math.round(grossCapex * 0.5 * inc.percent);
          else amount = inc.amount;
        }
      }
    }

    amount = Math.round(Math.max(0, amount));

    if (eligible && amount > 0 && inc.type !== 'Financing' && inc.type !== 'Tax Shield') {
      if (inc.timing === 'upfront' || inc.timing === 'point-of-sale') totalUpfront += amount;
      else totalDelayed += amount;
    }

    eligibleIncentives.push({
      incentive: { ...inc, amount },
      amount,
      eligible: eligible && (amount > 0 || inc.type === 'Financing' || inc.type === 'Free Service'),
      reason: eligible && amount === 0 && inc.type !== 'Financing' && inc.type !== 'Free Service' ? 'No applicable savings data' : reason,
      timing: inc.timing,
    });
  }

  const bridgeFinancingTotal = Math.round(ctItcAmount * commercialRate * 1.25);
  const totalGrants = totalUpfront + totalDelayed;
  const dayOneFinancedAmount = grossCapex - totalUpfront;
  const netCapex = grossCapex - totalGrants;
  const incentiveCoverage = grossCapex > 0 ? totalGrants / grossCapex : 0;
  const cibEligible = ghgReduction >= 0.30;

  return {
    eligibleIncentives: eligibleIncentives
      .filter(e => e.eligible || (e.reason !== 'No applicable savings data' && e.incentive.intakeStatus !== 'closed'))
      .sort((a, b) => (a.eligible === b.eligible ? b.amount - a.amount : a.eligible ? -1 : 1)),
    totalUpfront, totalDelayed, totalGrants, ctItcAmount, ctItcBasis,
    bridgeFinancingTotal, dayOneFinancedAmount, netCapex, incentiveCoverage, cibEligible,
  };
}
