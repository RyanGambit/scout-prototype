
import { RetrofitMeasure } from '../types';

// Helper for common archetype groups
const ALL_ARCHETYPES = ['High Rise Office', 'Low Rise Office', 'High Rise MURB (Residential)', 'Low Rise MURB (Residential)', 'Townhouse Complex', 'Retail Strip', 'Big Box Retail', 'Shopping Mall', 'Warehouse', 'Light Industrial', 'Data Center', 'School (Primary)', 'School (Secondary)', 'University / College', 'Healthcare / Clinic', 'Hospital', 'Hotel', 'Community Center', 'Place of Worship'];
const RESIDENTIAL = ['High Rise MURB (Residential)', 'Low Rise MURB (Residential)', 'Townhouse Complex'];
const COMMERCIAL = ['High Rise Office', 'Low Rise Office', 'Retail Strip', 'Big Box Retail', 'Shopping Mall', 'Hotel'];
const INDUSTRIAL = ['Warehouse', 'Light Industrial', 'Data Center'];

export const MEASURE_CATALOG: RetrofitMeasure[] = [
    {
        id: 'led',
        name: 'LED Upgrade',
        category: 'Electrical',
        description: 'Replace legacy lighting (T12/T8/HID) with high-efficiency LEDs and occupancy sensors.',
        costPerSqFt: 3.5,
        energySavingsPct: 0.10, 
        ghgReductionPct: 0.05,
        selected: false,
        includedIn: ['light', 'deep', 'netzero'],
        applicableArchetypes: ALL_ARCHETYPES
    },
    {
        id: 'bas',
        name: 'Smart BAS / Controls',
        category: 'Mechanical',
        description: 'Upgrade Building Automation System for optimized scheduling, setbacks, and demand response.',
        costPerSqFt: 2.0,
        energySavingsPct: 0.08,
        ghgReductionPct: 0.08,
        selected: false,
        includedIn: ['light', 'deep', 'netzero'],
        applicableArchetypes: [...COMMERCIAL, ...INDUSTRIAL, 'High Rise MURB (Residential)', 'School (Primary)', 'School (Secondary)', 'Healthcare / Clinic']
    },
    {
        id: 'windows',
        name: 'Triple Glazed Windows',
        category: 'Envelope',
        description: 'Replace existing glazing with high performance fiberglass or thermally broken aluminum frames (U-0.28).',
        costPerSqFt: 25.0,
        energySavingsPct: 0.12,
        ghgReductionPct: 0.10,
        selected: false,
        includedIn: ['deep', 'netzero'],
        baseUValue: 0.28,
        applicableArchetypes: [...RESIDENTIAL, 'High Rise Office', 'Low Rise Office', 'School (Primary)', 'Hotel']
    },
    {
        id: 'heatpump',
        name: 'Air Source Heat Pumps',
        category: 'Mechanical',
        description: 'Electrify primary heating plant. Eliminate natural gas boiler dependency.',
        costPerSqFt: 20.0,
        energySavingsPct: 0.30,
        ghgReductionPct: 0.85, 
        selected: false,
        includedIn: ['deep', 'netzero'],
        baseCOP: 2.8,
        applicableArchetypes: ALL_ARCHETYPES
    },
    {
        id: 'insulation',
        name: 'Exterior Overcladding',
        category: 'Envelope',
        description: 'Add 4" mineral wool insulation to exterior facade to reduce thermal bridging.',
        costPerSqFt: 35.0,
        energySavingsPct: 0.15,
        ghgReductionPct: 0.15,
        selected: false,
        includedIn: ['netzero'],
        baseRValue: 16,
        applicableArchetypes: [...RESIDENTIAL, 'Low Rise Office', 'School (Primary)', 'School (Secondary)']
    },
    {
        id: 'dhw',
        name: 'DHW Heat Pump',
        category: 'Mechanical',
        description: 'Electrify domestic hot water production with CO2 heat pump water heaters.',
        costPerSqFt: 5.0,
        energySavingsPct: 0.05,
        ghgReductionPct: 0.10,
        selected: false,
        includedIn: ['deep', 'netzero'],
        applicableArchetypes: [...RESIDENTIAL, 'Hotel', 'Hospital', 'Community Center']
    },
    {
        id: 'solar',
        name: 'Rooftop Solar PV',
        category: 'Electrical',
        description: 'Install a photovoltaic array to generate on-site renewable electricity.',
        costPerSqFt: 12.0,
        energySavingsPct: 0.20,
        ghgReductionPct: 0.20,
        selected: false,
        includedIn: ['netzero'],
        applicableArchetypes: ALL_ARCHETYPES
    },
    {
        id: 'air-curtain',
        name: 'High-Velocity Air Curtains',
        category: 'Envelope',
        description: 'Install air curtains at loading docks and main entries to prevent infiltration.',
        costPerSqFt: 0.50,
        energySavingsPct: 0.03,
        ghgReductionPct: 0.02,
        selected: false,
        includedIn: ['light', 'deep'],
        applicableArchetypes: ['Warehouse', 'Retail Strip', 'Big Box Retail', 'Shopping Mall', 'Light Industrial']
    },
    {
        id: 'destrat',
        name: 'Destratification Fans',
        category: 'Mechanical',
        description: 'High-volume low-speed (HVLS) fans to push heat down from high ceilings.',
        costPerSqFt: 1.50,
        energySavingsPct: 0.07,
        ghgReductionPct: 0.05,
        selected: false,
        includedIn: ['light', 'deep'],
        applicableArchetypes: ['Warehouse', 'Big Box Retail', 'Light Industrial', 'Place of Worship', 'Community Center']
    },
    {
        id: 'garage-vfd',
        name: 'Garage CO Control',
        category: 'Mechanical',
        description: 'Install VFDs on parking garage exhaust fans linked to CO sensors.',
        costPerSqFt: 0.75,
        energySavingsPct: 0.04,
        ghgReductionPct: 0.01,
        selected: false,
        includedIn: ['light', 'deep'],
        applicableArchetypes: ['High Rise MURB (Residential)', 'High Rise Office', 'Shopping Mall', 'Hotel']
    }
];
