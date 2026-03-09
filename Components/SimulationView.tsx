
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, ComposedChart, ReferenceLine, Cell } from 'recharts';
import { BuildingData, RetrofitMeasure, SimulationContext, Scenario, MaturityLevel } from '../types';
import { Button } from './Button';
import { Settings2, Zap, Leaf, Wallet, Check, Plus, Info, AlertOctagon, RefreshCw, Sparkles, Sliders, Banknote, Edit3, Trash2, GitCompare, Save, Copy, Eye, EyeOff, BarChart3, PieChart, TrendingUp, Flame, Lightbulb, X, Activity, Thermometer, Wind, CloudSun, Globe, ShieldCheck, AlertTriangle, ExternalLink } from 'lucide-react';
import { INCENTIVES, calculateIncentiveStack, MeasureCostInput } from '../data/incentives';
import { getCarbonPriceForYear } from '../data/carbonPricing';
import { MEASURE_CATALOG } from '../data/measures'; // Import Master Catalog

interface SimulationViewProps {
    data: BuildingData;
    measuresCatalog: RetrofitMeasure[]; // AI Suggestions (Optional Override)
    onUpdate?: (ctx: SimulationContext) => void;
    activeScenario?: Scenario;
    onScenarioChange: (scenario: Scenario) => void;
    currentMaturity?: MaturityLevel;
    onMaturityUpdate?: (level: MaturityLevel) => void;
    onSaveScenario?: (scenario: Scenario) => void;
}

const safeNumber = (val: any, defaultVal = 0): number => {
    if (val === undefined || val === null) return defaultVal;
    if (typeof val === 'number') return isFinite(val) ? val : defaultVal;
    if (typeof val === 'string') {
        const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
        return isFinite(parsed) ? parsed : defaultVal;
    }
    return defaultVal;
};

const formatCurrency = (num: number, precision: number = 1): string => {
    const absNum = Math.abs(num);
    if (absNum >= 1_000_000) {
        return `$${(num / 1_000_000).toFixed(precision)}M`;
    }
    if (absNum >= 1_000) {
        return `$${(num / 1_000).toFixed(0)}k`;
    }
    return `$${Math.round(num).toLocaleString()}`;
};

// --- Helper: Estimate Geometry ---
const estimateGeometry = (data: BuildingData) => {
    const floorArea = safeNumber(data.areaSqFt, 10000);
    const stories = safeNumber(data.stories, 1);
    const wwr = safeNumber(data.windowWallRatio, 30);
    
    const footprintSqFt = floorArea / stories;
    const sideLength = Math.sqrt(footprintSqFt);
    const perimeter = sideLength * 4;
    const wallHeight = stories * 12;
    const totalWallArea = perimeter * wallHeight;
    const glazingArea = totalWallArea * (wwr / 100);
    const opaqueArea = totalWallArea - glazingArea;

    return { totalWallArea, glazingArea, opaqueArea, floorArea };
};

// --- Helper: Vintage-Based Baseline EUI ---
const getBaselineEUI = (yearBuilt: number) => {
    if (yearBuilt < 1980) return 300; 
    if (yearBuilt <= 2010) return 230; 
    if (yearBuilt <= 2017) return 160; 
    return 110; 
};

// --- Helper: Attribute-Aware Smart Status Check ---
const getSmartStatus = (m: RetrofitMeasure, data: BuildingData) => {
    // 1. Windows
    if (m.id === 'windows') {
        const winType = data.windowType || '';
        if (winType.includes('Triple') || winType.includes('High Performance') || winType.includes('Thermally broken')) {
            return { locked: true, label: 'Existing High Performance', type: 'success' as const };
        }
        if (data.yearBuilt > 2015) {
            return { locked: true, label: 'Code Compliant (New Build)', type: 'success' as const };
        }
    }

    // 2. Insulation
    if (m.id === 'insulation') {
        const wallType = data.wallType || '';
        if (wallType.includes('Insulated') || wallType.includes('EIFS')) {
            return { locked: true, label: 'Envelope Insulated', type: 'success' as const };
        }
        if (wallType.includes('Curtain Wall')) {
             return { locked: true, label: 'N/A for Curtain Wall', type: 'warning' as const };
        }
        if (data.yearBuilt > 2015) {
             return { locked: true, label: 'Code Compliant (New Build)', type: 'success' as const };
        }
    }

    // 3. HVAC
    if (m.id === 'heatpump') {
        const heatingSystem = data.heatingSystem || '';
        if (heatingSystem.includes('Heat Pump')) {
             return { locked: false, label: 'Existing System Detected', type: 'warning' as const };
        }
    }

    // 4. LED
    if (m.id === 'led' && data.yearBuilt > 2018) {
         return { locked: true, label: 'LED Standard', type: 'success' as const };
    }
    
    // 5. Garage VFD
    if (m.id === 'garage-vfd') {
        const archetype = data.archetype || '';
        if (!archetype.includes('High Rise') && !archetype.includes('Mall')) {
            return { locked: true, label: 'No Underground Parking', type: 'warning' as const };
        }
    }

    return null;
};

// --- Helper: Dynamic Measure Filtering ---
const generateApplicableMeasures = (data: BuildingData, aiSuggestions: RetrofitMeasure[]) => {
    // 1. Start with Master Catalog
    let pool = [...MEASURE_CATALOG];
    
    // 2. Filter by Archetype
    pool = pool.filter(m => {
        if (!m.applicableArchetypes) return true; // Available to all if undefined
        const archetype = data.archetype || '';
        return m.applicableArchetypes.includes(archetype);
    });

    // 3. Map to Scenario Format (reset selection)
    return pool.map(m => {
        // Did AI suggest this specific measure?
        const aiMatch = aiSuggestions.find(aiM => aiM.id === m.id);
        
        return {
            ...m,
            selected: false, // Default to unselected, let Smart Scope logic pick later
            rationale: aiMatch?.rationale || m.rationale, // Preserve AI rationale if available
            rValue: m.baseRValue,
            uValue: m.baseUValue,
            cop: m.baseCOP,
            efficiency: m.baseEfficiency
        };
    });
};

// --- Graph Components ---
const CumulativeCashFlowGraph = ({ data }: { data: any[] }) => {
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center text-sm">
                        <TrendingUp size={14} className="mr-2 text-emerald-500"/> 
                        Cumulative Cash Flow
                    </h3>
                    <p className="text-xs text-slate-500">Net Project Value over 20 Years</p>
                </div>
            </div>
            <div className="flex-1 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                        <Tooltip formatter={(val:number) => `$${val.toLocaleString()}`} contentStyle={{fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', borderRadius: '8px'}}/>
                        <Legend iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '10px'}}/>
                        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                        <Bar dataKey="annualFlow" name="Annual Net Flow" fill="#94a3b8" opacity={0.3} barSize={20} />
                        <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={3} dot={false} name="Cumulative Cash Flow" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const CostCompositionGraph = ({ baseCosts, propCosts }: { baseCosts: any, propCosts: any }) => {
    const data = [
        {
            name: 'Baseline',
            Electricity: Math.round(baseCosts.elec),
            HeatingFuel: Math.round(baseCosts.gas),
            CarbonTax: Math.round(baseCosts.carbon),
        },
        {
            name: 'Retrofit',
            Electricity: Math.round(propCosts.elec),
            HeatingFuel: Math.round(propCosts.gas),
            CarbonTax: Math.round(propCosts.carbon),
        }
    ];

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center text-sm"><Wallet size={14} className="mr-2 text-blue-500"/> Operational Cost Mix</h3>
                    <p className="text-xs text-slate-500">Annual Utility Spend Breakdown ($)</p>
                </div>
            </div>
            <div className="flex-1 min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 0, left: -10, bottom: 0 }} layout="vertical" barSize={25}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }} axisLine={false} tickLine={false} width={60} />
                        <Tooltip formatter={(val:number) => `$${val.toLocaleString()}`} cursor={{fill: 'transparent'}} contentStyle={{fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', borderRadius: '8px'}}/>
                        <Legend iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '10px'}}/>
                        <Bar dataKey="Electricity" stackId="a" fill="#3b82f6" />
                        <Bar dataKey="HeatingFuel" stackId="a" fill="#f97316" />
                        <Bar dataKey="CarbonTax" stackId="a" fill="#10b981" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const SimulationView: React.FC<SimulationViewProps> = ({ 
    data, 
    measuresCatalog,
    onUpdate, 
    activeScenario, 
    onScenarioChange,
    currentMaturity = MaturityLevel.LEVEL_0, 
    onMaturityUpdate,
    onSaveScenario
}) => {
    // Controlled State derived from activeScenario
    const [editingMeasureId, setEditingMeasureId] = useState<string | null>(null);
    const [showGlobalParams, setShowGlobalParams] = useState(false);
    
    const isEngineer = data.persona === 'Engineer / Architect';
    
    // Default fallback scenario
    const currentScenario = activeScenario || {
        id: 'default',
        name: "Default Scenario",
        measures: MEASURE_CATALOG.map(m => ({...m, selected: false, rValue: m.baseRValue, uValue: m.baseUValue, cop: m.baseCOP, efficiency: m.baseEfficiency })),
        preset: 'baseline',
        carbonPrice: getCarbonPriceForYear(new Date().getFullYear(), data.province || 'ON'),
        inflationRate: 3,
        discountRate: 5
    };

    const measures = currentScenario.measures || [];
    const preset = currentScenario.preset;
    const carbonPrice = currentScenario.carbonPrice;
    const inflationRate = currentScenario.inflationRate || 3;
    const discountRate = currentScenario.discountRate || 5;

    const updateScenario = (updates: Partial<Scenario>) => {
        onScenarioChange({
            ...currentScenario,
            ...updates
        });
    };

    // --- Dynamic Package Selection (Attribute-Aware) ---
    // Runs when data.id changes OR when explicit 'init' is requested
    useEffect(() => {
        if (currentScenario.id === 'init') {
            const regionalPrice = getCarbonPriceForYear(new Date().getFullYear(), data.province || 'ON');

            // 1. Generate appropriate pool based on Archetype (e.g. remove Loading Dock for Condo)
            const archetypeFilteredMeasures = generateApplicableMeasures(data, measuresCatalog);

            // 2. Apply Smart Status Logic (Filter out Locked items from selection)
            const smartSelection = archetypeFilteredMeasures.map(m => {
                const status = getSmartStatus(m, data);
                // If it's locked (e.g. Compliant or Existing High Performance), do NOT select it
                const shouldSelect = !status?.locked; 
                return {
                    ...m,
                    selected: shouldSelect
                };
            });

            onScenarioChange({
                ...currentScenario,
                id: 'auto-generated',
                carbonPrice: regionalPrice, 
                preset: 'custom',
                measures: smartSelection
            });
        }
    }, [data.id, data.province, data.archetype]);

    // --- Constraints Logic ---
    const isHeritageMasonry = useMemo(() => {
        const wallType = data.wallType || '';
        return (wallType.includes('Masonry') || wallType.includes('Brick')) && data.yearBuilt < 1940;
    }, [data.wallType, data.yearBuilt]);

    const applyPreset = (p: 'baseline' | 'light' | 'deep' | 'netzero') => {
        // Regenerate catalog to ensure it matches current archetype
        const currentCatalog = generateApplicableMeasures(data, measuresCatalog);

        const newMeasures = currentCatalog.map(m => {
            const status = getSmartStatus(m, data);
            
            // Base logic from catalog presets
            let isSelected = p === 'baseline' ? false : (m.includedIn || []).includes(p);
            
            // Override 1: Heritage Masonry Check
            if (m.id === 'insulation' && isHeritageMasonry && isSelected) isSelected = false;
            
            // Override 2: Attribute-Aware Smart Check (If locked, never select)
            if (status?.locked) isSelected = false;

            return {
                ...m,
                selected: isSelected,
                rValue: m.baseRValue,
                uValue: m.baseUValue,
                cop: m.baseCOP,
                efficiency: m.baseEfficiency
            };
        });
        
        let name = "Custom Strategy";
        if (p === 'baseline') name = "Current Baseline";
        if (p === 'light') name = "Light Touch (Quick Payback)";
        if (p === 'deep') name = "Deep Retrofit (Comprehensive)";
        if (p === 'netzero') name = "Net Zero Carbon";
        
        updateScenario({ measures: newMeasures, preset: p, name });

        if (p !== 'baseline' && onMaturityUpdate && currentMaturity < MaturityLevel.LEVEL_3) {
            onMaturityUpdate(MaturityLevel.LEVEL_3);
        }
    };

    const handleMeasureChange = (id: string, field: keyof RetrofitMeasure, value: any) => {
        const newMeasures = measures.map(m => m.id === id ? {...m, [field]: value} : m);
        updateScenario({ measures: newMeasures, preset: 'custom', name: 'Custom Strategy' });
    };

    const toggleMeasure = (id: string) => {
        if (id === 'insulation' && isHeritageMasonry) return;
        
        const measure = calculatedMeasures.find(m => m.id === id);
        if (measure && measure.smartStatus && measure.smartStatus.locked) {
            return;
        }

        const newMeasures = measures.map(m => m.id === id ? { ...m, selected: !m.selected } : m);
        updateScenario({ measures: newMeasures, preset: 'custom', name: 'Custom Strategy' });
        
        if (newMeasures.some(m => m.selected) && onMaturityUpdate && currentMaturity < MaturityLevel.LEVEL_3) {
             onMaturityUpdate(MaturityLevel.LEVEL_3);
        }
    };

    // --- GEOMETRY & PHYSICS ENGINE ---
    const geometry = useMemo(() => estimateGeometry(data), [data]);
    
    // --- SMART SCOPE & CONTEXT AWARE MEASURES ---
    const calculatedMeasures = useMemo(() => measures.map(m => {
        let processed = { ...m };
        let smartStatus = getSmartStatus(m, data);
        let effectiveCost = m.costPerSqFt; 
        let effectiveSavings = m.energySavingsPct;

        // Apply Logic if Locked/Warning
        if (smartStatus) {
            if (smartStatus.locked) {
                processed.selected = false;
                effectiveCost = 0; 
            }
            if (smartStatus.label === "Existing System Detected") {
                 processed.name = "Heat Pump Optimization";
                 effectiveCost = m.costPerSqFt * 0.1; 
                 effectiveSavings = m.energySavingsPct * 0.2; 
            }
        }

        // --- GEOMETRIC PROXIES ---
        if (m.id === 'windows') {
            const unitCost = 90; 
            effectiveCost = (unitCost * geometry.glazingArea) / geometry.floorArea; 
        } else if (m.id === 'insulation') {
            const unitCost = 45; 
            effectiveCost = (unitCost * geometry.opaqueArea) / geometry.floorArea;
        } else if (m.id === 'air-curtain') {
            // Rough logic: 1 air curtain per 10000sqft or per door estimate
            const doors = Math.ceil(geometry.floorArea / 15000);
            effectiveCost = (5000 * doors) / geometry.floorArea;
        }

        // --- SAVINGS ADJUSTMENTS ---
        if (m.id === 'insulation' && m.rValue && m.baseRValue && m.baseRValue > 0) {
            effectiveSavings = m.energySavingsPct * (m.rValue / m.baseRValue);
        }
        if (m.id === 'windows' && m.uValue && m.baseUValue && m.uValue > 0) {
            effectiveSavings = m.energySavingsPct * (m.baseUValue / m.uValue);
        }
        if (m.id === 'heatpump' && m.cop && m.baseCOP && m.baseCOP > 0) {
            effectiveSavings = m.energySavingsPct * (m.cop / m.baseCOP);
        }

        // --- RIGHT SIZING SYNERGY ---
        let synergyApplied = false;
        const selectedM = (measures || []).filter(mea => mea.selected);
        const hasEnvelope = selectedM.some(mea => (mea.id === 'windows' || mea.id === 'insulation') && mea.selected);
        if (m.id === 'heatpump' && hasEnvelope) {
            effectiveCost *= 0.75; // 25% Reduction
            synergyApplied = true;
        }

        // --- INCENTIVE LINKING ---
        const linkedIncentives = INCENTIVES.filter(inc => {
            if (inc.trigger === 'All') return false; // Don't badge general ones
            // Filter by Province for UI badges
            if (inc.applicableProvinces && !inc.applicableProvinces.includes(data.province || 'ON')) return false;
            
            return m.name.toLowerCase().includes(inc.trigger.toLowerCase()) || 
                   (m.id === 'heatpump' && inc.trigger === 'Heat Pumps') ||
                   (m.id === 'windows' && inc.trigger === 'Triple Windows');
        });

        return { 
            ...processed, 
            effectiveCost, 
            effectiveSavings, 
            synergyApplied,
            smartStatus,
            linkedIncentives
        };
    }), [measures, data, geometry]);

    const selectedCalculatedMeasures = calculatedMeasures.filter(m => m.selected);
    const totalCapEx = selectedCalculatedMeasures.reduce((sum, m) => sum + (m.effectiveCost * geometry.floorArea), 0);
    const hasHeatPump = selectedCalculatedMeasures.some(m => m.id === 'heatpump' || m.id === 'dhw');

    // --- Detailed Simulation Logic ---
    const simulationDetails = useMemo(() => {
        const baseEUI = data.utilityBillUploaded 
            ? safeNumber(data.energyConsumption, 250) 
            : getBaselineEUI(data.yearBuilt);

        const baseHeatingShare = 0.50;
        const baseCoolingShare = 0.10;
        const baseLightingShare = 0.15;
        const baseOtherShare = 0.25;

        const elecRate = 0.15; 
        const gasRate = 0.50; 
        
        const heatingSystem = data.heatingSystem || '';
        // Default to gas unless explicitly electric/heat pump, or if it mentions Gas/Boiler/Furnace
        const isElectric = heatingSystem.includes('Electric') || heatingSystem.includes('Resistance') || heatingSystem.includes('Baseboard');
        const heatingSystemGas = (heatingSystem.includes('Gas') || heatingSystem.includes('Boiler') || heatingSystem.includes('Furnace') || heatingSystem.includes('Rooftop') || heatingSystem.includes('RTU')) || !isElectric;
        
        const baseElecUsage = (baseEUI * geometry.floorArea / 10.764 * 0.4); 
        const baseGasUsage = heatingSystemGas ? (baseEUI * geometry.floorArea / 10.764 * 0.6) / 10.55 : 0;
        
        const hasSolar = selectedCalculatedMeasures.some(m => m.id === 'solar');
        const hasLED = selectedCalculatedMeasures.some(m => m.id === 'led');
        const hasBAS = selectedCalculatedMeasures.some(m => m.id === 'bas');

        let heatingLoadReduction = 0;
        const winMeasure = selectedCalculatedMeasures.find(m => m.id === 'windows');
        const insMeasure = selectedCalculatedMeasures.find(m => m.id === 'insulation');
        const airCurtain = selectedCalculatedMeasures.find(m => m.id === 'air-curtain');
        
        if (winMeasure) heatingLoadReduction += winMeasure.effectiveSavings;
        if (insMeasure) heatingLoadReduction += insMeasure.effectiveSavings;
        if (airCurtain) heatingLoadReduction += airCurtain.effectiveSavings;
        heatingLoadReduction = Math.min(heatingLoadReduction, 0.60); 

        let coolingLoadReduction = heatingLoadReduction * 0.7; 

        let lightingReduction = 0;
        const ledMeasure = selectedCalculatedMeasures.find(m => m.id === 'led');
        if (ledMeasure) lightingReduction = ledMeasure.effectiveSavings * 5; 

        const baseHeatingEUI = baseEUI * baseHeatingShare;
        const baseCoolingEUI = baseEUI * baseCoolingShare;
        const baseLightingEUI = baseEUI * baseLightingShare;
        const baseOtherEUI = baseEUI * baseOtherShare;

        const reducedHeatingLoad = baseHeatingEUI * (1 - heatingLoadReduction);
        
        let propHeatingEUI = reducedHeatingLoad;
        let propCoolingEUI = baseCoolingEUI * (1 - coolingLoadReduction);
        
        let propGasUsage = baseGasUsage;
        let propElecUsage = baseElecUsage;

        if (hasHeatPump && heatingSystemGas) {
            const hp = selectedCalculatedMeasures.find(m => m.id === 'heatpump');
            const cop = hp?.cop || 3.0;
            propGasUsage = baseGasUsage * 0.05; 
            const gasHeatEnergykWh = (baseGasUsage * 10.55) * (1 - heatingLoadReduction);
            const addedEleckWh = (gasHeatEnergykWh * 0.85) / cop;
            propElecUsage += addedEleckWh;
            propHeatingEUI = (reducedHeatingLoad * 0.85) / cop; 
        } else if (!hasHeatPump && heatingSystemGas) {
             propGasUsage = baseGasUsage * (1 - heatingLoadReduction);
             propHeatingEUI = reducedHeatingLoad;
        }

        const areaM2 = geometry.floorArea / 10.764;
        const lightingSavingskWh = (baseLightingEUI * areaM2) * lightingReduction;
        propElecUsage = Math.max(0, propElecUsage - lightingSavingskWh);
        const propLightingEUI = baseLightingEUI * (1 - lightingReduction);

        if (hasSolar) {
             const solarGenkWh = geometry.floorArea * 12 * 0.2; 
             propElecUsage = Math.max(0, propElecUsage - solarGenkWh);
        }

        const propEUI = propHeatingEUI + propCoolingEUI + propLightingEUI + baseOtherEUI;
        
        const baseElecCost = baseElecUsage * elecRate;
        const baseGasCost = baseGasUsage * gasRate;
        const baseCarbonTax = (baseGasUsage * 1.9 * 0.001) * carbonPrice; 

        const propElecCost = propElecUsage * elecRate;
        const propGasCost = propGasUsage * gasRate;
        const propCarbonTax = (propGasUsage * 1.9 * 0.001) * carbonPrice;

        const coolingBonus = hasHeatPump ? 0.50 * geometry.floorArea : 0;
        
        const gridDefenseSavings = (hasLED && hasBAS) ? (baseElecCost * 0.30) * 0.15 : 0;

        return {
            baseEUI,
            propEUI,
            baseCost: { elec: baseElecCost, gas: baseGasCost, carbon: baseCarbonTax },
            propCost: { elec: propElecCost, gas: propGasCost, carbon: propCarbonTax },
            coBenefits: { cooling: coolingBonus, grid: gridDefenseSavings },
        };

    }, [data, calculatedMeasures, geometry, carbonPrice]);


    const utilitySavings = (simulationDetails.baseCost.elec + simulationDetails.baseCost.gas + simulationDetails.baseCost.carbon) - 
                          (simulationDetails.propCost.elec + simulationDetails.propCost.gas + simulationDetails.propCost.carbon);
    
    const annualSavings = utilitySavings + simulationDetails.coBenefits.cooling + simulationDetails.coBenefits.grid;
    const carbonSavings = simulationDetails.baseCost.carbon - simulationDetails.propCost.carbon;
    const energySavings = annualSavings - carbonSavings;

    const baseCarbon = simulationDetails.baseCost.carbon / (carbonPrice || 1);
    const propCarbon = simulationDetails.propCost.carbon / (carbonPrice || 1);
    const ghgReduction = baseCarbon > 0 ? (baseCarbon - propCarbon) / baseCarbon : 0;

    // Calculate Total Incentives using the centralized engine
    const totalIncentives = useMemo(() => {
        const selectedMeasures = (measures || []).filter(m => m.selected);
        
        const measureInputs: MeasureCostInput[] = selectedMeasures.map(m => ({
            id: m.id,
            name: m.name,
            cost: m.costPerSqFt * (data.areaSqFt || 1),
            category: m.category,
            kwhSaved: m.energySavingsPct * (data.elecUsage || 0),
        }));

        const stack = calculateIncentiveStack({
            measures: measureInputs,
            grossCapex: totalCapEx,
            province: data.province || 'ON',
            ghgReduction,
            organizationType: data.organizationType,
            commercialRate: 0.065,
            annualGasSavingsM3: (data.gasUsage || 0) * ghgReduction,
            annualElecSavingsKwh: (data.elecUsage || 0) * 0.2,
            city: data.city,
            annualElecKwh: data.elecUsage || 0,
        });
        
        return stack.totalGrants;
    }, [measures, totalCapEx, annualSavings, ghgReduction, data, simulationDetails.propEUI, propCarbon]);

    const netCapEx = totalCapEx - totalIncentives;
    const netPaybackYears = annualSavings > 0 ? netCapEx / annualSavings : 0;

    const gasSavingsM3 = useMemo(() => {
        const baseGas = simulationDetails.baseCost.gas / 0.50; // reverse engineer m3 from cost (gasRate = 0.50)
        const propGas = simulationDetails.propCost.gas / 0.50;
        return Math.max(0, baseGas - propGas);
    }, [simulationDetails]);

    useEffect(() => {
        if (onUpdate) {
            onUpdate({
                totalCapEx,
                annualSavings,
                energySavings,
                gasSavingsM3,
                paybackYears: netPaybackYears,
                ghgReduction: ghgReduction,
                selectedMeasures: measures.filter(m => m.selected).map(m => m.name),
                eui: simulationDetails.propEUI,
                carbonTotal: propCarbon
            });
        }
    }, [totalCapEx, annualSavings, energySavings, gasSavingsM3, ghgReduction, measures, simulationDetails.propEUI, propCarbon, netPaybackYears]);

    const handleSave = () => {
        if (onSaveScenario) {
            onSaveScenario({
                ...currentScenario,
                id: Date.now().toString(),
                name: `Scenario ${new Date().toLocaleTimeString()}`,
                results: {
                    totalCapEx,
                    annualSavings,
                    paybackYears: netPaybackYears,
                    ghgReduction: ghgReduction,
                    selectedMeasures: measures.filter(m => m.selected).map(m => m.name),
                    eui: simulationDetails.propEUI,
                    carbonTotal: propCarbon
                }
            });
        }
    };

    const cashFlowData = useMemo(() => {
        const dataPoints = [];
        const projectionYears = 20;
        
        const baseOpex = simulationDetails.baseCost.elec + simulationDetails.baseCost.gas;
        const propOpex = simulationDetails.propCost.elec + simulationDetails.propCost.gas;

        const netCapEx = totalCapEx - totalIncentives;
        let cumulative = -netCapEx;

        const currentYear = new Date().getFullYear();
        
        // Year 0: Initial Investment
        dataPoints.push({
            year: 0,
            annualFlow: -netCapEx,
            cumulative: -netCapEx
        });

        for (let y = 1; y <= projectionYears; y++) {
            const currentCarbonPrice = getCarbonPriceForYear(currentYear + y, data.province || 'ON');
            const inflation = Math.pow(1 + (inflationRate/100), y);

            // BAU Costs (Avoided Cost)
            const annualCarbonBAU = (simulationDetails.baseCost.carbon / carbonPrice) * currentCarbonPrice;
            let deferredMaintenance = 0;
            if (y === 3 && data.yearBuilt < 2000) {
                deferredMaintenance = 10 * geometry.floorArea; 
            }
            const bauCost = (baseOpex * inflation) + annualCarbonBAU + deferredMaintenance;

            // Retrofit Costs (New Cost)
            const annualCarbonProp = (simulationDetails.propCost.carbon / carbonPrice) * currentCarbonPrice;
            const coBenefits = simulationDetails.coBenefits.cooling + simulationDetails.coBenefits.grid;
            const retrofitCost = (propOpex * inflation) + annualCarbonProp - (coBenefits * inflation);

            // Net Cash Flow = Avoided Cost - New Cost
            const annualSavings = bauCost - retrofitCost;
            
            cumulative += annualSavings;
            
            dataPoints.push({
                year: y,
                annualFlow: Math.round(annualSavings),
                cumulative: Math.round(cumulative)
            });
        }
        return dataPoints;
    }, [simulationDetails, totalCapEx, totalIncentives, carbonPrice, inflationRate, data.yearBuilt, geometry.floorArea, data.province]);


    const renderMeasureCard = (m: ReturnType<typeof useMemo<any>>[0]) => {
        const isOvercladdingDisabled = m.id === 'insulation' && isHeritageMasonry;
        const isEditing = editingMeasureId === m.id;
        const synergyActive = m.synergyApplied;
        const smartStatus = m.smartStatus;
        const incentives = m.linkedIncentives || [];
        
        const isSmartDisabled = smartStatus && smartStatus.locked;

        return (
            <div key={m.id} className={`p-4 rounded-xl border transition-all relative group 
                ${m.selected ? 'bg-emerald-50 border-emerald-200 shadow-sm' : isSmartDisabled ? 'bg-slate-50 border-slate-100 opacity-75' : 'bg-white border-slate-200'}`}>
                
                {isOvercladdingDisabled && <div className="absolute inset-0 bg-slate-50/50 z-10 cursor-not-allowed rounded-xl"></div>}
                
                <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-800">{m.name}</h4>
                            {smartStatus && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex items-center
                                    ${smartStatus.type === 'success' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}
                                `}>
                                    {smartStatus.type === 'success' ? <ShieldCheck size={10} className="mr-1"/> : <AlertTriangle size={10} className="mr-1"/>}
                                    {smartStatus.label}
                                </span>
                            )}
                            {/* Incentive Badge */}
                            {incentives.length > 0 && !isSmartDisabled && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border flex items-center bg-blue-50 text-blue-700 border-blue-200">
                                    <Banknote size={10} className="mr-1"/>
                                    {incentives.length > 1 ? `${incentives.length} Incentives` : `Grant Available`}
                                </span>
                            )}
                        </div>
                        {synergyActive && <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-full border border-blue-200 mt-1 inline-block">Right-Sizing Discount Active</span>}
                    </div>
                    <div className="relative flex items-center">
                         {!isSmartDisabled && (
                             <button
                                onClick={() => toggleMeasure(m.id)}
                                disabled={isOvercladdingDisabled}
                                className={`w-10 h-6 rounded-full flex items-center transition-colors ${m.selected ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <span className={`inline-block w-4 h-4 bg-white rounded-full transform transition-transform ${m.selected ? 'translate-x-5' : 'translate-x-1'}`}></span>
                            </button>
                         )}
                    </div>
                </div>
                
                {isEditing ? (
                    <div className="mt-3 space-y-3 animate-fadeIn bg-slate-50 p-3 rounded-lg border border-slate-200">
                         <div className="flex items-center justify-between">
                             <h5 className="text-xs font-bold text-slate-600 uppercase">Configuration</h5>
                             <button onClick={() => setEditingMeasureId(null)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                             <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase">Cost ($/sqft)</label>
                                <input type="number" value={m.costPerSqFt} onChange={e => handleMeasureChange(m.id, 'costPerSqFt', safeNumber(e.target.value))} className="w-full text-xs p-1.5 rounded border bg-white outline-none"/>
                            </div>
                         </div>
                        <Button size="sm" variant="primary" onClick={() => setEditingMeasureId(null)} className="w-full h-7 text-xs">Apply Changes</Button>
                    </div>
                ) : (
                    <>
                        <p className="text-xs text-slate-500 mt-1">{m.description}</p>
                        
                        {/* Incentive List Details (Visible when selected or hovered) */}
                        {incentives.length > 0 && !isSmartDisabled && (
                            <div className="mt-2 space-y-1">
                                {incentives.map((inc, idx) => (
                                    <div key={idx} className="flex items-center text-[10px] text-blue-600">
                                        <Plus size={8} className="mr-1"/>
                                        <span className="font-semibold">{inc.name}:</span>
                                        <span className="ml-1 text-slate-500 truncate max-w-[150px]">{formatCurrency(inc.amount)} {inc.type}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-2 flex flex-wrap gap-2">
                             {m.id === 'heatpump' && m.cop && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">COP: {m.cop}</span>}
                             {m.id === 'windows' && m.uValue && <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">U-Val: {m.uValue}</span>}
                        </div>
                        {isEngineer && !isSmartDisabled && (
                            <button onClick={() => setEditingMeasureId(m.id)} className="text-slate-400 hover:text-slate-700 absolute bottom-2 right-2 p-1 rounded-full hover:bg-slate-200 transition-colors opacity-0 group-hover:opacity-100">
                                <Edit3 size={12}/>
                            </button>
                        )}
                    </>
                )}
            </div>
        );
    }
    
    return (
        <div className="space-y-6 pb-12 max-w-7xl mx-auto">
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-900">Retrofit Simulator</h1>
                </div>
                <div className="flex items-center space-x-2">
                     <button 
                        onClick={() => setShowGlobalParams(!showGlobalParams)}
                        className={`px-3 py-1.5 rounded-lg border flex items-center space-x-2 shadow-sm text-sm transition-colors ${showGlobalParams ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Globe size={14} className={showGlobalParams ? "text-emerald-400" : "text-slate-400"}/>
                        <span className="font-semibold text-xs">Global Params</span>
                    </button>

                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {(['baseline', 'light', 'deep', 'netzero'] as const).map(p => <button key={p} onClick={() => applyPreset(p)} className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase ${preset === p ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{p}</button>)}
                    </div>
                    {isEngineer && (
                        <button onClick={handleSave} className="ml-2 flex items-center bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-900 shadow-sm">
                            <Save size={14} className="mr-2"/> Save Scenario
                        </button>
                    )}
                </div>
            </header>

            {/* Smart Insight for Payback Analysis */}
            {netPaybackYears > 20 && (
                <div className={`border rounded-xl p-4 flex items-start gap-3 animate-fadeIn ${data.yearBuilt > 2010 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
                     <div className={`p-2 rounded-full ${data.yearBuilt > 2010 ? 'bg-amber-100' : 'bg-blue-100'}`}>
                         <Lightbulb size={20} className={data.yearBuilt > 2010 ? 'text-amber-600' : 'text-blue-600'}/>
                     </div>
                     <div>
                         <h3 className={`font-bold ${data.yearBuilt > 2010 ? 'text-amber-900' : 'text-blue-900'}`}>
                             {data.yearBuilt > 2010 ? "Strategic Insight: Diminishing Returns" : "Strategic Insight: High Capital Intensity"}
                         </h3>
                         <p className={`text-sm mt-1 ${data.yearBuilt > 2010 ? 'text-amber-800' : 'text-blue-800'}`}>
                             {data.yearBuilt > 2010 
                                ? `This asset is relatively modern (Built ${data.yearBuilt}). Deep retrofits may not yield a competitive ROI (Payback: ${netPaybackYears.toFixed(0)} years).`
                                : `Deep retrofits for buildings of this vintage (${data.yearBuilt}) often have longer payback periods (${netPaybackYears.toFixed(0)} years) due to scope complexity.`
                             }
                         </p>
                         <p className={`text-sm font-semibold mt-2 ${data.yearBuilt > 2010 ? 'text-amber-800' : 'text-blue-800'}`}>
                             Recommended Strategy: <span className="underline">{data.yearBuilt > 2010 ? 'Solar PV + Load Shifting' : 'Leverage CIB financing to bridge the CapEx gap'}</span>.
                         </p>
                     </div>
                </div>
            )}

            {/* Global Parameters Panel */}
            {showGlobalParams && (
                <div className="bg-slate-800 text-slate-200 p-4 rounded-xl shadow-lg mb-6 animate-fadeIn">
                     <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
                         <h3 className="font-bold flex items-center text-sm text-white"><Globe size={16} className="mr-2 text-emerald-400"/> Financial & Economic Assumptions</h3>
                         <button onClick={() => setShowGlobalParams(false)} className="text-slate-400 hover:text-white"><X size={16}/></button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="space-y-2">
                             <div className="flex justify-between items-center">
                                 <label className="text-xs font-semibold text-slate-400 uppercase">Carbon Price ($/tonne)</label>
                                 <span className="text-[10px] text-emerald-400 bg-slate-700 px-1.5 rounded">{data.province || 'FED'} Schedule</span>
                             </div>
                             <div className="flex items-center space-x-2">
                                <input type="range" min="0" max="300" step="10" value={carbonPrice} onChange={(e) => updateScenario({carbonPrice: parseInt(e.target.value), preset: 'custom', name: 'Custom Strategy'})} className="w-full h-2 accent-emerald-500 bg-slate-600 rounded-lg appearance-none"/>
                                <span className="font-mono font-bold text-white w-12 text-right">${carbonPrice}</span>
                             </div>
                             <p className="text-[10px] text-slate-500">
                                 {data.province === 'QC' ? 'Modeled as Cap & Trade market.' : 'Modeled as Federal Backstop (Escalating to $170/t).'}
                             </p>
                         </div>
                         <div className="space-y-2">
                             <label className="text-xs font-semibold text-slate-400 uppercase">Energy Inflation (%)</label>
                             <div className="flex items-center space-x-2">
                                <input type="range" min="0" max="10" step="0.5" value={inflationRate} onChange={(e) => updateScenario({inflationRate: parseFloat(e.target.value), preset: 'custom', name: 'Custom Strategy'})} className="w-full h-2 accent-blue-500 bg-slate-600 rounded-lg appearance-none"/>
                                <span className="font-mono font-bold text-white w-12 text-right">{inflationRate}%</span>
                             </div>
                         </div>
                         <div className="space-y-2">
                             <label className="text-xs font-semibold text-slate-400 uppercase">Discount Rate (%)</label>
                             <div className="flex items-center space-x-2">
                                <input type="range" min="0" max="10" step="0.5" value={discountRate} onChange={(e) => updateScenario({discountRate: parseFloat(e.target.value), preset: 'custom', name: 'Custom Strategy'})} className="w-full h-2 accent-purple-500 bg-slate-600 rounded-lg appearance-none"/>
                                <span className="font-mono font-bold text-white w-12 text-right">{discountRate}%</span>
                             </div>
                         </div>
                     </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 uppercase font-semibold">Total CapEx</p><p className="text-2xl font-bold text-slate-900">{formatCurrency(totalCapEx)}</p>{data.yearBuilt < 2000 && <p className="text-xs text-slate-400 mt-1">Inclusive of labor</p>}</div>
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 uppercase font-semibold">Est. Incentives</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIncentives)}</p></div>
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 uppercase font-semibold">Annual Savings</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(annualSavings)}</p></div>
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 uppercase font-semibold">GHG Reduction</p><div className="flex items-end space-x-2"><p className="text-2xl font-bold text-slate-900">{Math.round(ghgReduction * 100)}%</p></div></div>
                 <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm"><p className="text-xs text-slate-500 uppercase font-semibold">Net Payback</p><p className="text-2xl font-bold text-slate-900">{netPaybackYears > 0 ? netPaybackYears.toFixed(1) : 'N/A'} <span className="text-sm text-slate-400 font-normal">Yrs</span></p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scope Items</h3>
                    {calculatedMeasures.map(renderMeasureCard)}
                </div>

                <div className="lg:col-span-2 grid grid-cols-2 gap-4 h-min self-start">
                    <div className="col-span-2 h-[320px]">
                        <CumulativeCashFlowGraph data={cashFlowData} />
                    </div>
                    <div className="col-span-2 h-[320px]">
                        <CostCompositionGraph baseCosts={simulationDetails.baseCost} propCosts={simulationDetails.propCost} />
                    </div>
                </div>
            </div>
        </div>
    );
};
