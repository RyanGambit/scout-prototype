/**
 * GRANT APPLICATION WORKFLOW — SEQUENCED ROADMAP
 * Source: 55 King St E Retrofit Financial Model v4 — Section 6 & 7
 *
 * The non-negotiable rule: IESO and Enbridge pre-approvals must be received
 * BEFORE any purchase orders are signed or work begins. Starting work early
 * causes PERMANENT disqualification. This is the most common and costly error
 * in Ontario incentive programs.
 */

export interface WorkflowPhase {
  id: string;
  phaseNumber: number;
  name: string;
  timeline: string;
  weekStart: number;
  weekEnd: number;
  isCritical: boolean;
  criticalWarning?: string;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  id: string;
  stepNumber: string; // e.g. "1.1", "1.2"
  title: string;
  owner: string;
  description: string;
  contact?: string;
  deadline?: string;
  prerequisite?: string[];
  documents?: string[];
  isCriticalPath: boolean;
  relatedIncentives?: string[]; // Array of incentive IDs this step applies to
}

export interface LenderDocument {
  id: string;
  name: string;
  source: string;
  required: boolean;
  usedBy: string[];
  notes?: string;
}

export const APPLICATION_PHASES: WorkflowPhase[] = [
  {
    id: 'phase-0',
    phaseNumber: 0,
    name: 'Pre-Engagement',
    timeline: 'Weeks 1–2',
    weekStart: 1,
    weekEnd: 2,
    isCritical: false,
    steps: [
      {
        id: 'step-0-1',
        stepNumber: '0.1',
        title: 'Gather 24-month utility data',
        owner: 'Owner',
        description: 'Obtain electricity (Enova Power / LDC) and gas (Enbridge) account data for past 24 months. Most LDCs now offer downloadable CSV via MyAccount.',
        isCriticalPath: true,
        documents: ['24-month electricity bills or Green Button data', '24-month gas bills'],
      },
      {
        id: 'step-0-2',
        stepNumber: '0.2',
        title: 'Confirm building ownership and tax status',
        owner: 'Owner',
        description: 'Verify: (a) taxable corporation or REIT (for CT ITC eligibility), (b) zero residential units (for CMHC MLI Select exclusion), (c) Enbridge gas account holder.',
        isCriticalPath: false,
        documents: ['Corporate tax return (T2) or trust return (T3)', 'Title/deed'],
      },
      {
        id: 'step-0-3',
        stepNumber: '0.3',
        title: 'Engage energy consultant',
        owner: 'Owner',
        description: 'Engage ASHRAE-certified energy auditor for Level 2 audit. This is required for CIB application and strongly recommended for IESO Custom pre-approval.',
        isCriticalPath: true,
        contact: 'Local ASHRAE chapter or IESO delivery agent list',
      },
    ],
  },
  {
    id: 'phase-1',
    phaseNumber: 1,
    name: 'Incentive Pre-Approvals',
    timeline: 'Weeks 3–6',
    weekStart: 3,
    weekEnd: 6,
    isCritical: true,
    criticalWarning: '⚠ CRITICAL: Nothing can be purchased or installed until pre-approvals are received. Starting work early causes PERMANENT disqualification from IESO and Enbridge programs.',
    steps: [
      {
        id: 'step-1-1',
        stepNumber: '1.1',
        title: 'Submit IESO Custom + Prescriptive Combination Application',
        owner: 'Owner + Energy Consultant',
        description: 'Submit via IESO Retrofit Portal: project scope, baseline electricity use, contractor quotes, M&V Plan outline. BEFORE signing any purchase orders.',
        contact: 'retrofit@ieso.ca | 1-844-303-5542 | LDC delivery agent (e.g. Enova Power 519-745-4771)',
        isCriticalPath: true,
        documents: ['IESO application form', 'Baseline electricity data', 'Contractor quotes (minimum 2)', 'M&V plan outline'],
        deadline: 'Review: 4-8 weeks',
        relatedIncentives: ['ieso-custom', 'ieso-prescriptive']
      },
      {
        id: 'step-1-2',
        stepNumber: '1.2',
        title: 'Submit Enbridge Commercial Custom application',
        owner: 'Owner + Energy Consultant',
        description: 'Submit Enbridge gas savings application. Pre-approval required before equipment purchase. Different fuel from IESO = always stacks.',
        contact: 'Enbridge Commercial Programs | enbridgegas.com/commercial',
        isCriticalPath: true,
        documents: ['Enbridge application form', 'Gas savings calculation', 'Equipment specifications'],
        relatedIncentives: ['enbridge-custom']
      },
      {
        id: 'step-1-3',
        stepNumber: '1.3',
        title: 'IESO Solar Confirmation — Prescriptive vs Custom',
        owner: 'Energy Consultant',
        description: 'HIGHEST PRIORITY VERIFICATION: Confirm with IESO whether solar PV system qualifies for Prescriptive ($860/kW-AC) or must go Custom. This single decision can change total incentives by $110K+.',
        contact: 'retrofit@ieso.ca',
        isCriticalPath: true,
        relatedIncentives: ['ieso-solar']
      },
      {
        id: 'step-1-4',
        stepNumber: '1.4',
        title: 'Engage CIB / BDC for construction financing',
        owner: 'Owner + Financial Advisor',
        description: 'CIB requires ASHRAE L2 audit + confirmed 30%+ GHG reduction. Submit pre-approval letters, preliminary GHG calculation, 2 years financial statements.',
        contact: 'CIB: 1-833-551-5245 | retrofits@cib-bic.ca | BDC: local branch',
        isCriticalPath: false,
        documents: ['ASHRAE L2 audit report', 'Pre-approval letters (IESO, Enbridge)', 'GHG reduction calculation', '2-year financial statements'],
        relatedIncentives: ['cib-loan', 'bdc-loan']
      },
    ],
  },
  {
    id: 'phase-2',
    phaseNumber: 2,
    name: 'Project Execution',
    timeline: 'Weeks 7–20',
    weekStart: 7,
    weekEnd: 20,
    isCritical: false,
    steps: [
      {
        id: 'step-2-1',
        stepNumber: '2.1',
        title: 'Sign purchase orders and contracts',
        owner: 'Owner',
        description: 'ONLY after receiving IESO and Enbridge pre-approval letters. Engage contractors for ASHP installation, LED retrofit, BAS installation, and solar PV.',
        prerequisite: ['step-1-1', 'step-1-2'],
        isCriticalPath: true,
      },
      {
        id: 'step-2-2',
        stepNumber: '2.2',
        title: 'Install submetering (pre-retrofit)',
        owner: 'Submetering Provider',
        description: 'Install smart submeters BEFORE retrofit to establish IESO EPP-eligible baseline. Source from Ontario providers (Measurable Innovations, Carma, PowerStream).',
        isCriticalPath: false,
      },
      {
        id: 'step-2-3',
        stepNumber: '2.3',
        title: 'Execute retrofit phases',
        owner: 'Contractor Team',
        description: 'Phase 1: LED + BAS (least disruptive, fastest payback). Phase 2: ASHP installation + electrical upgrade. Phase 3: Solar PV + net metering connection.',
        isCriticalPath: true,
      },
      {
        id: 'step-2-4',
        stepNumber: '2.4',
        title: 'Commission and verify systems',
        owner: 'Energy Consultant + Contractor',
        description: 'ASHRAE-standard commissioning of all systems. Verify BAS control sequences, ASHP COP at rated conditions, solar output vs PVWatts model.',
        documents: ['Commissioning report', 'Equipment cut sheets with serial numbers'],
        isCriticalPath: true,
      },
    ],
  },
  {
    id: 'phase-3',
    phaseNumber: 3,
    name: 'Post-Project Submissions & Payments',
    timeline: 'Weeks 21–32',
    weekStart: 21,
    weekEnd: 32,
    isCritical: false,
    steps: [
      {
        id: 'step-3-1',
        stepNumber: '3.1',
        title: 'Submit IESO completion report + M&V data',
        owner: 'Energy Consultant',
        description: 'Submit actual energy savings data and completion documentation to IESO. Payment within ~14 weeks of approved submission.',
        contact: 'retrofit@ieso.ca',
        documents: ['IESO completion form', 'M&V report', 'Contractor invoices', 'Equipment serial numbers'],
        isCriticalPath: true,
        relatedIncentives: ['ieso-custom', 'ieso-prescriptive']
      },
      {
        id: 'step-3-2',
        stepNumber: '3.2',
        title: 'Submit Enbridge completion report',
        owner: 'Energy Consultant',
        description: 'Submit gas savings verification to Enbridge. Faster turnaround than IESO (~6 weeks).',
        documents: ['Enbridge completion form', 'Gas savings verification'],
        isCriticalPath: false,
        relatedIncentives: ['enbridge-custom']
      },
      {
        id: 'step-3-3',
        stepNumber: '3.3',
        title: 'File CT ITC on corporate T2 return',
        owner: 'CPA / Tax Advisor',
        description: 'Claim 30% refundable ITC on Schedule 31. Basis = eligible equipment cost minus all government grants. Bridge finance the $130K for ~12-18 months.',
        documents: ['Schedule 31', 'Equipment invoices', 'Grant letters (for basis reduction)'],
        isCriticalPath: true,
        deadline: 'Next T2 filing after equipment available for use',
        relatedIncentives: ['ct-itc']
      },
      {
        id: 'step-3-4',
        stepNumber: '3.4',
        title: 'Apply for net metering agreement',
        owner: 'Solar Installer + Owner',
        description: 'Submit net metering application to local LDC (e.g. Enova Power in Waterloo). Required for solar revenue recognition.',
        contact: 'Enova Power: 519-745-4771',
        documents: ['Net metering application', 'Electrical Safety Authority certificate', 'Solar PV specifications'],
        isCriticalPath: false,
      },
    ],
  },
  {
    id: 'phase-4',
    phaseNumber: 4,
    name: 'Ongoing Operations',
    timeline: 'Year 1–20',
    weekStart: 52,
    weekEnd: 1040,
    isCritical: false,
    steps: [
      {
        id: 'step-4-1',
        stepNumber: '4.1',
        title: 'Enroll in Demand Response (Capacity Auction)',
        owner: 'Owner + Aggregator',
        description: 'With BAS + ASHP, building qualifies for IESO Capacity Auction. Conservative: ~100 kW × $50/kW-year = ~$5,000/yr. Zero capex, recurring payments.',
        contact: 'Voltus, Enel X, or IESO-registered aggregator',
        isCriticalPath: false,
      },
      {
        id: 'step-4-2',
        stepNumber: '4.2',
        title: 'Pursue BOMA BEST / ENERGY STAR certification',
        owner: 'Owner + Building Manager',
        description: 'Target ENERGY STAR 75+ and BOMA BEST Gold. Required for green premium (L6) and vacancy improvement (L7) business case levers.',
        isCriticalPath: false,
      },
      {
        id: 'step-4-3',
        stepNumber: '4.3',
        title: 'Negotiate green lease addenda at renewal',
        owner: 'Owner + Property Manager',
        description: 'Green lease clauses for cost-sharing, submetering data obligations, and tenant operational commitments. Standard in tech/professional services market.',
        isCriticalPath: false,
      },
      {
        id: 'step-4-4',
        stepNumber: '4.4',
        title: 'Annual M&V reporting (if IESO EPP enrolled)',
        owner: 'Energy Consultant',
        description: 'If enrolled in IESO EPP or Enbridge P4P, submit annual performance data for ongoing payments.',
        isCriticalPath: false,
      },
    ],
  },
];


/**
 * LENDER PACKAGE CHECKLIST
 * Source: 55 King v4 Section 7
 */
export const LENDER_DOCUMENTS: LenderDocument[] = [
  {
    id: 'doc-1',
    name: 'ASHRAE Level 2 Energy Audit',
    source: 'Energy Consultant',
    required: true,
    usedBy: ['CIB', 'BDC', 'Lender'],
    notes: 'Required for CIB application. Confirms ≥30% GHG reduction potential.',
  },
  {
    id: 'doc-2',
    name: 'IESO Pre-Approval Letter',
    source: 'IESO',
    required: true,
    usedBy: ['Lender', 'CIB'],
    notes: 'Bankable commitment. Shows confirmed incentive amount.',
  },
  {
    id: 'doc-3',
    name: 'Enbridge Pre-Approval Letter',
    source: 'Enbridge',
    required: true,
    usedBy: ['Lender', 'CIB'],
  },
  {
    id: 'doc-4',
    name: 'CT ITC CPA Confirmation (Schedule 31)',
    source: 'CPA / Tax Advisor',
    required: true,
    usedBy: ['Lender'],
    notes: 'Have CPA confirm allocation method. Credit may be $130K-$141K.',
  },
  {
    id: 'doc-5',
    name: 'Contractor Quotes (minimum 2)',
    source: 'Contractors',
    required: true,
    usedBy: ['IESO', 'Enbridge', 'CIB', 'Lender'],
  },
  {
    id: 'doc-6',
    name: '24-Month Utility Bills',
    source: 'Enova Power / Enbridge',
    required: true,
    usedBy: ['IESO', 'Enbridge', 'Energy Consultant'],
  },
  {
    id: 'doc-7',
    name: '20-Year Cash Flow Model',
    source: 'Financial Advisor / Scout AI',
    required: true,
    usedBy: ['Lender', 'CIB'],
    notes: 'Must match escalation-adjusted table. Include DCF at 7.5% WACC.',
  },
  {
    id: 'doc-8',
    name: '2-Year Financial Statements',
    source: 'Accountant',
    required: true,
    usedBy: ['CIB', 'BDC', 'Lender'],
  },
  {
    id: 'doc-9',
    name: 'Building Condition Assessment',
    source: 'Building Engineer',
    required: false,
    usedBy: ['Lender'],
    notes: 'Recommended. Shows lifecycle timing of existing equipment.',
  },
  {
    id: 'doc-10',
    name: 'Environmental Site Assessment (Phase 1)',
    source: 'Environmental Consultant',
    required: false,
    usedBy: ['Lender'],
    notes: 'Required for some lenders. Not needed for CIB.',
  },
  {
    id: 'doc-11',
    name: 'Net Metering Application (Solar)',
    source: 'Solar Installer',
    required: false,
    usedBy: ['LDC'],
    notes: 'Required for solar revenue recognition.',
  },
];


/**
 * Key contacts directory
 */
export const KEY_CONTACTS = [
  { name: 'IESO Retrofit Program', email: 'retrofit@ieso.ca', phone: '1-844-303-5542', purpose: 'Custom + Prescriptive applications, pre-approvals' },
  { name: 'Enova Power (Waterloo LDC)', phone: '519-745-4771', purpose: 'IESO delivery agent for Waterloo Region; net metering' },
  { name: 'Enbridge Commercial Programs', url: 'enbridgegas.com/commercial', purpose: 'Gas savings rebates, DDP, P4P' },
  { name: 'Canada Infrastructure Bank (CIB)', email: 'retrofits@cib-bic.ca', phone: '1-833-551-5245', purpose: 'Low-interest retrofit financing' },
  { name: 'BDC Green Building Loan', url: 'bdc.ca', purpose: 'Green building financing, interest-only first 36mo' },
  { name: 'CRA — Schedule 31 (CT ITC)', url: 'canada.ca/en/revenue-agency', purpose: 'Clean Technology ITC filing' },
  { name: 'CMHC MLI Select', url: 'cmhc-schl.gc.ca', purpose: 'Multi-residential financing (if applicable)' },
];


/**
 * Timing badges for incentive display
 */
export type TimingBadge = {
  label: string;
  color: string; // Tailwind color class
  icon: string;
  description: string;
};

export const TIMING_BADGES: Record<string, TimingBadge> = {
  upfront: {
    label: 'Upfront',
    color: 'bg-green-100 text-green-800',
    icon: '💰',
    description: 'Received before or at project start. Reduces Day-1 financing.',
  },
  'point-of-sale': {
    label: 'Point of Sale',
    color: 'bg-green-100 text-green-800',
    icon: '🏷️',
    description: 'Instant discount at participating distributor. Zero paperwork.',
  },
  'post-completion': {
    label: 'Post-Completion',
    color: 'bg-yellow-100 text-yellow-800',
    icon: '⏳',
    description: 'Claimed after project completion and M&V verification.',
  },
  'tax-filing': {
    label: 'Tax Filing',
    color: 'bg-orange-100 text-orange-800',
    icon: '📋',
    description: 'Claimed on next corporate T2 return. Must be bridge-financed.',
  },
  ongoing: {
    label: 'Ongoing',
    color: 'bg-blue-100 text-blue-800',
    icon: '🔄',
    description: 'Recurring annual payments based on verified performance.',
  },
};
