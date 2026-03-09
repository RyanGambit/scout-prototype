
export enum MaturityLevel {
  LEVEL_0 = 0, // Ghost (Public Data)
  LEVEL_1 = 1, // Sketch (User Intent)
  LEVEL_2 = 2, // Baseline (Validation)
  LEVEL_3 = 3, // Business Case (Modeling)
  LEVEL_4 = 4  // Partner Ready (Terms of Reference)
}

export type Persona = 'Owner / Manager' | 'Engineer / Architect' | 'Workforce / Trades';
export type Priority = 'Reduce Bills' | 'Fix Comfort/Drafts' | 'Net Zero Compliance' | 'Capital Renewal';

export interface BuildingData {
  id: string; // Unique ID for multi-property support
  address: string;
  province: string; // Added for Regional Carbon Pricing
  city?: string; // Added for municipal programs
  yearBuilt: number;
  archetype: string;
  areaSqFt: number;
  stories: number;
  occupancyType: string;
  
  // Business Case Parameters
  capRate?: number;
  rentPerSqft?: number;
  occupancy?: number;
  capitalBudget?: number;
  
  // Ownership Context
  organizationType?: string;
  ownershipModel?: string;
  motivation?: string;
  investmentAppetite?: string;
  timelineFlexibility?: string;
  debtConcerns?: boolean;
  tenantDisruptionSensitivity?: string;
  businessType?: string;
  processLoadType?: string;
  
  // Climate Data
  climateZone?: string;
  hdd?: number; // Heating Degree Days
  cdd?: number; // Cooling Degree Days

  // Envelope
  wallType: string;
  roofType: string;
  windowType: string;
  windowWallRatio: number; // %

  // Mechanical
  heatingSystem: string;
  coolingSystem: string;
  ventilationSystem: string;
  
  // Performance
  energyConsumption: number; // kWh/m2/yr (EUI)
  elecUsage: number; // Total Annual kWh
  gasUsage: number; // Total Annual m3
  occupancy?: number; // %
  rentPerSqft?: number; // $
  capRate?: number; // %
  utilityBillUploaded: boolean;
  capitalPlanUploaded?: boolean; // New: Engineering Report/Capital Plan
  monthlyData?: { month: string; elec: number; gas: number; cost: number }[]; // Synthetic or Real 12-month profile
  dataSources?: {
    electricity?: string;
    gas?: string;
    market?: string;
  };
  
  // Data Quality
  isEstimate: boolean;

  // Onboarding
  persona?: Persona;
  priority?: Priority;

  // State
  savedScenarios?: Scenario[];
  actionPlan?: ActionPlan; // Persisted Action Plan
}

// Persisted State for the Simulator View
export interface Scenario {
  id: string;
  name: string;
  measures: RetrofitMeasure[];
  preset: 'custom' | 'baseline' | 'light' | 'deep' | 'netzero' | 'risk_mitigation'; // Added risk_mitigation
  
  // Global Params
  carbonPrice: number;
  inflationRate: number;
  discountRate: number;

  results?: SimulationContext; // Store results for comparison
}

// Interface to share Simulation Results with Chat
export interface SimulationContext {
  totalCapEx: number;
  annualSavings: number;
  energySavings: number; // Added to separate energy from carbon
  gasSavingsM3?: number; // Added to pass precise gas savings
  paybackYears: number;
  ghgReduction: number;
  selectedMeasures: string[]; // List of IDs or Names
  
  // Engineer Details
  eui: number;
  carbonTotal: number;
}

export interface Source {
  title: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  sources?: Source[];
}

export enum TabView {
  BASELINE = 'baseline',
  PATHWAYS = 'pathways', // New Strategic Fork
  SIMULATION = 'simulation',
  FINANCING = 'financing',
  ACTIONS = 'actions',
  REPORTS = 'reports',
  COMPARE = 'compare',
  DOCS = 'docs'
}

export interface RetrofitMeasure {
  id: string;
  name: string;
  category: 'Envelope' | 'Mechanical' | 'Electrical';
  description: string;
  costPerSqFt: number;
  energySavingsPct: number; // Approximate % reduction impact
  ghgReductionPct: number; // Approximate % carbon reduction
  selected: boolean;
  applicableArchetypes?: string[];
  includedIn: string[];
  rationale?: string; // AI-generated reason for suggesting this measure
  
  // For detailed view
  baseRValue?: number;
  rValue?: number;
  baseUValue?: number;
  uValue?: number;
  baseCOP?: number;
  cop?: number;
  baseEfficiency?: number;
  efficiency?: number;
}

export interface ActionPlan {
    title: string;
    executiveSummary: string;
    scenarioId?: string; // Track which scenario generated this plan
    simulationCapEx?: number; // Track the CapEx that generated this plan
    phases: {
        name: string;
        timeline: string;
        technicalDetails: string; // General description
        standards: string[]; // Array of specific codes/standards for cleaner UI
        steps: string[];
    }[];
    incentiveStrategy: string[];
    localPartners: {
        category: string;
        name: string;
        description: string;
    }[];
    risks?: {
        category: string;
        risk: string;
        mitigation: string;
        severity: 'Low' | 'Medium' | 'High';
    }[];
    references?: Source[]; // Grounding sources
}
