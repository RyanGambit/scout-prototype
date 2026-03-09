import React, { useState, useEffect, useMemo } from 'react';
import { BuildingData, MaturityLevel, SimulationContext, ActionPlan, Scenario, TabView } from '../types';
import { Lock, ClipboardCheck, Sparkles, ArrowRight, RotateCw, Calendar, CheckSquare, Banknote, FileCheck, HardHat, Building2, BookOpen, ExternalLink, Globe, Link, Users, SearchX, LineChart, Wallet, Zap, Wind, Thermometer, Layout, Download, FileText, Mail, FileBarChart, ChevronUp, ChevronDown, Clock, Phone } from 'lucide-react';
import { Button } from './Button';
import { generateActionPlan } from '../services/geminiService';
import { INCENTIVES, calculateIncentiveStack, MeasureCostInput } from '../data/incentives';
import { getCarbonPriceForYear } from '../data/carbonPricing';
import { APPLICATION_PHASES, TIMING_BADGES, LENDER_DOCUMENTS } from '../data/applicationWorkflow';

interface ActionsViewProps {
  level: MaturityLevel;
  data: BuildingData;
  simulationContext?: SimulationContext;
  activeScenario?: Scenario;
  onUpdatePlan?: (plan: ActionPlan) => void;
  onNavigate: (tab: TabView) => void;
}

// Mock Regional Partners Database
const REGIONAL_PARTNERS: Record<string, { category: string, name: string, description: string }[]> = {
    'ON': [
        { category: 'Turnkey', name: 'Efficiency Capital', description: 'Fully managed process with off-balance sheet financing.' },
        { category: 'Engineering', name: 'Enova', description: 'Local LDC partner for incentive administration.' },
        { category: 'Engineering', name: 'WSP Canada', description: 'Deep retrofit engineering & modeling.' }
    ],
    'BC': [
        { category: 'Utility', name: 'BC Hydro', description: 'CleanBC electrification incentives.' },
        { category: 'Engineering', name: 'Prism Engineering', description: 'Energy audits and mechanical design.' },
        { category: 'Funding', name: 'FortisBC', description: 'Rebates for high-efficiency upgrades.' }
    ],
    'AB': [
        { category: 'Funding', name: 'ERA (Emissions Reduction Alberta)', description: 'Technology innovation funding.' },
        { category: 'Engineering', name: 'Revolve Engineering', description: 'Sustainable mechanical design.' }
    ]
};

const SMALL_PROJECT_PARTNERS: Record<string, { category: string, name: string, description: string }[]> = {
    'ON': [
        { category: 'Supplier', name: 'O\'Dell Associates', description: 'Direct supplier for HVAC and Heat Pump equipment.' },
        { category: 'Contractor', name: 'Local Mechanical', description: 'Direct installation and maintenance of mechanical systems.' },
        { category: 'Supplier', name: 'Nedco / Rexel', description: 'Wholesale distributor for LED lighting and controls.' }
    ],
    'BC': [
        { category: 'Supplier', name: 'E.B. Horsman & Son', description: 'Electrical and lighting distributor.' },
        { category: 'Contractor', name: 'BC Mechanical', description: 'HVAC installation and service.' }
    ],
    'AB': [
        { category: 'Supplier', name: 'Wolseley Canada', description: 'Plumbing and HVAC distributor.' },
        { category: 'Contractor', name: 'Alberta HVAC', description: 'Local mechanical contractor.' }
    ]
};

// Helper to format links
const formatStrategyText = (text: string) => {
    const rawUrlRegex = /(https?:\/\/[^\s]+)/g;
    const rawParts = text.split(rawUrlRegex);
    if (rawParts.length > 1) {
         return rawParts.map((part, i) => {
            if (part.match(/^https?:\/\//)) {
                 return (
                    <a key={i} href={part} target="_blank" rel="noreferrer" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 hover:underline font-semibold mx-1" onClick={(e) => e.stopPropagation()}>
                        [Link] <ExternalLink size={10} className="ml-0.5" />
                    </a>
                );
            }
             return <span key={i}>{part}</span>;
        });
    }
    return text;
};

export const ActionsView: React.FC<ActionsViewProps> = ({ level, data, simulationContext, activeScenario, onUpdatePlan, onNavigate }) => {
    
    const [isLoading, setIsLoading] = useState(false);
    const [showWorkflow, setShowWorkflow] = useState(false);
    
    // Use the active scenario (from Pathways) to determine the scope
    const scenario = activeScenario;
    const plan = data.actionPlan;

    // Calculate High Level Metrics for Dashboard
    const scopeItems = scenario?.measures?.filter(m => m.selected) || [];
    const mainMeasures = scopeItems.slice(0, 3);
    const estCapex = simulationContext?.totalCapEx ?? scopeItems.reduce((acc, m) => acc + (m.costPerSqFt * data.areaSqFt), 0);
    
    // Check if eligible for Turnkey (High CapEx or Complex)
    const isTurnkeyRecommended = estCapex > 500000;

    // Derived Logic for Partners
    const regionalPartners = isTurnkeyRecommended 
        ? (REGIONAL_PARTNERS[data.province] || REGIONAL_PARTNERS['ON'])
        : (SMALL_PROJECT_PARTNERS[data.province] || SMALL_PROJECT_PARTNERS['ON']);

    const scenarioMeasures = scenario?.measures?.filter(m => m.selected)?.map(m => m.name) || [];
    const contextMeasures = simulationContext?.selectedMeasures || [];
    const isContextSynced = scenarioMeasures.length === contextMeasures.length && 
                            scenarioMeasures.every(m => contextMeasures.includes(m));

    const province = data.province || 'ON';
    
    const eligibleIncentives = useMemo(() => {
        return INCENTIVES.filter(inc => {
            if (inc.applicableProvinces && !inc.applicableProvinces.includes(province)) return false;
            if (inc.trigger === 'All') return true;
            return scenarioMeasures.some(m => m.toLowerCase().includes(inc.trigger.toLowerCase())) ||
                   (inc.equipmentTarget || []).some(eqId => scenarioMeasures.some(m => m.toLowerCase().includes(eqId)));
        });
    }, [scenarioMeasures, province]);

    const activeIncentiveIds = eligibleIncentives.map(i => i.id);

    const filteredPhases = useMemo(() => {
        return APPLICATION_PHASES.map(phase => {
            const filteredSteps = phase.steps.filter(step => {
                if (step.relatedIncentives && step.relatedIncentives.length > 0) {
                    return step.relatedIncentives.some(incId => activeIncentiveIds.includes(incId));
                }
                return true; // Keep general steps
            });
            return { ...phase, steps: filteredSteps };
        }).filter(phase => phase.steps.length > 0);
    }, [activeIncentiveIds]);

    // If we have a scenario but no plan, auto-generate
    useEffect(() => {
        // We need to generate if:
        // 1. We don't have a plan at all
        // 2. The plan we have is for a different scenario
        // 3. The simulation context has changed (e.g. user edited a measure's cost in the simulation view)
        
        const hasPlanForCurrentScenario = plan && plan.scenarioId === scenario?.id;
        
        // We use totalCapEx as a proxy for "has the simulation changed?"
        // If the simulation context's capex doesn't match the plan's capex (which we'll store), we need to regenerate
        const hasSimulationChanged = plan && plan.simulationCapEx !== simulationContext?.totalCapEx;

        if (scenario && isContextSynced && (!hasPlanForCurrentScenario || hasSimulationChanged) && !isLoading) {
            handleGenerate();
        }
    }, [scenario?.id, isContextSynced, plan?.scenarioId, plan?.simulationCapEx, simulationContext?.totalCapEx]);

    const handleGenerate = async () => {
        setIsLoading(true);
        try {
            const generatedPlan = await generateActionPlan(data, simulationContext, eligibleIncentives);
            if (onUpdatePlan) {
                // Attach the scenario ID and current simulation CapEx to the plan
                onUpdatePlan({
                    ...generatedPlan,
                    scenarioId: scenario?.id,
                    simulationCapEx: simulationContext?.totalCapEx
                });
            }
        } catch (error) {
            console.error("Critical failure in Actions View:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!scenario) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8">
                <p className="text-slate-500">Please select a Strategy in the <strong>Pathways</strong> tab first.</p>
                <Button className="mt-4" onClick={() => onNavigate(TabView.PATHWAYS)}>Go to Pathways</Button>
            </div>
        );
    }

    if (isLoading) {
        return (
             <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8">
                <Sparkles size={32} className="text-emerald-500 animate-pulse mb-4"/>
                <p className="text-slate-500 font-medium">Scout is formulating your Strategic Roadmap...</p>
                <p className="text-xs text-slate-400 mt-2">Aligning scope with regional partners and incentives.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fadeIn">
            
            {/* 1. Strategic Header */}
            <div className="bg-slate-900 rounded-xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center space-x-2 mb-2 text-emerald-400">
                                <Sparkles size={16}/>
                                <span className="text-xs font-bold uppercase tracking-wider">Active Strategy</span>
                            </div>
                            <h1 className="text-3xl font-bold mb-2">{scenario.name || "Custom Retrofit Strategy"}</h1>
                            <p className="text-slate-300 max-w-2xl">{plan?.executiveSummary || "A tailored roadmap to decarbonize your asset while maximizing financial returns."}</p>
                        </div>
                        {/* Scope Snapshot */}
                        <div className="hidden lg:block text-right">
                             <div className="text-sm text-slate-400 uppercase font-bold mb-1">Estimated CapEx</div>
                             <div className="text-2xl font-bold text-white mb-4">${(estCapex / 1000).toFixed(0)}k</div>
                             <div className="text-sm text-slate-400 uppercase font-bold mb-1">Key Drivers</div>
                             <div className="flex gap-2 justify-end">
                                 {mainMeasures.map(m => (
                                     <span key={m.id} className="text-xs bg-slate-800 border border-slate-700 px-2 py-1 rounded text-slate-300">
                                         {m.name}
                                     </span>
                                 ))}
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Split Incentive Analysis (for multi-tenant buildings) */}
            {data.occupancyType?.includes('Multi') && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                        <Wallet size={20} className="mr-2 text-purple-600"/> Split Incentive Analysis
                    </h3>
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 mb-4">
                        <p className="text-sm text-purple-800">
                            <strong>Multi-tenant buildings face the "split incentive" problem:</strong> the owner pays for upgrades, but tenants capture the utility savings.
                            Scout recommends submetering and green lease clauses to protect NOI.
                        </p>
                        <p className="text-xs text-purple-600 mt-2 italic">
                            ⓘ L5 Reframing: Submetering transfers utility billing from landlord to tenants. The 10-15% behavioral savings accrue to tenants. The landlord benefit is: (1) elimination of utility cost risk from NOI, (2) green lease cost-sharing enablement, and (3) EPP baseline data. Do NOT book behavioral savings as landlord cash flow.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h4 className="text-sm font-bold text-slate-700 mb-2">Without Submetering</h4>
                            <p className="text-2xl font-bold text-red-600">-${Math.round((simulationContext?.annualSavings || 0) * 0.4 / 1000)}k/yr</p>
                            <p className="text-xs text-slate-500 mt-1">NOI leakage to tenants</p>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                            <h4 className="text-sm font-bold text-emerald-700 mb-2">With Submetering</h4>
                            <p className="text-2xl font-bold text-emerald-600">NOI Protected</p>
                            <p className="text-xs text-slate-500 mt-1">Utility cost risk transferred to tenants. Hardware: $20-35K, payback 2-3yr.</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-bold text-blue-700 mb-2">Green Lease Premium</h4>
                            <p className="text-2xl font-bold text-blue-600">
                                +${Math.round((data.rentPerSqft || 18) * (data.areaSqFt || 41800) * (data.occupancy || 0.85) * 0.04 / 1000)}k/yr
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                4% premium × ${data.rentPerSqft || 18}/sqft × {((data.occupancy || 0.85) * 100).toFixed(0)}% occ
                                = ${Math.round((data.rentPerSqft || 18) * (data.areaSqFt || 41800) * (data.occupancy || 0.85) * 0.04 / (data.capRate || 0.07) / 1000)}K asset value at {((data.capRate || 0.07) * 100).toFixed(0)}% cap
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Actionable Outputs (Downloads) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                 <h3 className="font-bold text-slate-800 mb-6 flex items-center">
                    <Download size={20} className="mr-2 text-emerald-600"/> Actionable Outputs
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border border-slate-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group">
                        <FileText size={24} className="text-slate-400 group-hover:text-emerald-600 mb-3"/>
                        <h4 className="font-bold text-slate-800 text-sm">Assessment Summary</h4>
                        <p className="text-xs text-slate-500 mt-1">2-page PDF overview tailored for {data.persona || 'Owners'}.</p>
                        <span className="text-[10px] text-emerald-600 font-bold mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">Download PDF &rarr;</span>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group">
                        <FileBarChart size={24} className="text-slate-400 group-hover:text-emerald-600 mb-3"/>
                        <h4 className="font-bold text-slate-800 text-sm">Internal Business Case</h4>
                        <p className="text-xs text-slate-500 mt-1">One-pager for CFO/Board with financial breakdown.</p>
                         <span className="text-[10px] text-emerald-600 font-bold mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">Download PPT &rarr;</span>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group">
                        <Banknote size={24} className="text-slate-400 group-hover:text-emerald-600 mb-3"/>
                        <h4 className="font-bold text-slate-800 text-sm">Incentive Applications</h4>
                        <p className="text-xs text-slate-500 mt-1">Pre-filled drafts for identified grants.</p>
                         <span className="text-[10px] text-emerald-600 font-bold mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">View Drafts &rarr;</span>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group">
                        <Mail size={24} className="text-slate-400 group-hover:text-emerald-600 mb-3"/>
                        <h4 className="font-bold text-slate-800 text-sm">Partner Contact Pkg</h4>
                        <p className="text-xs text-slate-500 mt-1">Intro emails for Engineering/Turnkey partners.</p>
                         <span className="text-[10px] text-emerald-600 font-bold mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">Generate Emails &rarr;</span>
                    </div>
                </div>
            </div>

            {/* 3. Partners & Routing */}
            {plan && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-3 space-y-6">
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-slate-800 flex items-center">
                                    <Users size={20} className="mr-2 text-blue-600"/> Recommended Partners
                                </h3>
                                {isTurnkeyRecommended && (
                                    <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded">Turnkey Recommended</span>
                                )}
                            </div>
                            
                            {isTurnkeyRecommended && (
                                <div className="mb-4 p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-800">
                                    Due to scope complexity, Scout recommends a <strong>Turnkey Provider</strong> to manage risk and financing.
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {regionalPartners.map((partner, i) => {
                                    // Highlight Turnkey if recommended
                                    const isHighlighted = isTurnkeyRecommended && partner.category === 'Turnkey';
                                    return (
                                        <div key={i} className={`p-4 rounded-lg border ${isHighlighted ? 'bg-white border-purple-300 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-sm text-slate-800">{partner.name}</h4>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${isHighlighted ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{partner.category}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-tight mb-3">{partner.description}</p>
                                            <div className="flex gap-2 mt-auto">
                                                <button className="p-1.5 bg-white border border-slate-200 rounded hover:border-blue-400 hover:text-blue-600 transition-colors" title="Visit Website">
                                                    <Globe size={12} />
                                                </button>
                                                <button className="p-1.5 bg-white border border-slate-200 rounded hover:border-blue-400 hover:text-blue-600 transition-colors" title="Email Partner">
                                                    <Mail size={12} />
                                                </button>
                                                <button className="p-1.5 bg-white border border-slate-200 rounded hover:border-blue-400 hover:text-blue-600 transition-colors" title="Call Partner">
                                                    <Phone size={12} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* =============================================== */}
            {/* APPLICATION ROADMAP                             */}
            {/* =============================================== */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-lg"><Clock className="text-amber-600" size={20} /></div>
                        <div className="text-left">
                            <h3 className="font-bold text-slate-800">Application Roadmap</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Sequenced to avoid disqualification — {filteredPhases.length} phases
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-xs text-red-800 font-bold">
                            ⚠ NON-NEGOTIABLE: IESO and Enbridge pre-approvals must be received BEFORE any purchase orders are signed or work begins. Starting work early causes PERMANENT disqualification.
                        </p>
                    </div>
                    {filteredPhases.map(phase => (
                        <div key={phase.id} className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className={`p-3 flex items-center gap-2 ${phase.isCritical ? 'bg-red-50 border-b border-red-200' : 'bg-slate-50 border-b border-slate-200'}`}>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${phase.isCritical ? 'bg-red-200 text-red-800' : 'bg-slate-200 text-slate-700'}`}>
                                    Phase {phase.phaseNumber}
                                </span>
                                <span className="font-bold text-sm text-slate-800">{phase.name}</span>
                                <span className="text-xs text-slate-500 ml-auto">{phase.timeline}</span>
                            </div>
                            {phase.criticalWarning && (
                                <div className="bg-red-50 px-3 py-2 border-b border-red-100">
                                    <p className="text-[11px] text-red-700 font-medium">{phase.criticalWarning}</p>
                                </div>
                            )}
                            <div className="p-3 space-y-3">
                                {phase.steps.map(step => (
                                    <div key={step.id} className="flex gap-3">
                                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 w-8 flex-shrink-0">{step.stepNumber}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className="text-xs font-medium text-slate-800">
                                                    {step.isCriticalPath && <span className="text-red-500 mr-1">●</span>}
                                                    {step.title}
                                                </p>
                                                {(step.title.toLowerCase().includes('application') || step.title.toLowerCase().includes('submit')) && (
                                                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 ml-2" onClick={() => alert(`Generating application draft for: ${step.title}`)}>
                                                        <Sparkles size={10} className="mr-1 text-emerald-500"/> Generate Draft
                                                    </Button>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5">{step.description}</p>
                                            {step.relatedIncentives && step.relatedIncentives.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {step.relatedIncentives.map(incId => {
                                                        const inc = INCENTIVES.find(i => i.id === incId);
                                                        return inc ? (
                                                            <span key={incId} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center">
                                                                <Banknote size={8} className="mr-1" /> {inc.name}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            )}
                                            {step.contact && <p className="text-[10px] text-indigo-600 mt-1 flex items-center gap-1"><Mail size={10}/> {step.contact}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Lender Document Checklist */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <h4 className="font-bold text-sm text-slate-700 mb-4">Lender Package Checklist</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                            {LENDER_DOCUMENTS.map(doc => (
                                <div key={doc.id} className="flex items-start gap-2 text-xs">
                                    <span className={`mt-0.5 ${doc.required ? 'text-red-500' : 'text-slate-300'}`}>
                                        {doc.required ? '●' : '○'}
                                    </span>
                                    <div>
                                        <span className="font-medium text-slate-700">{doc.name}</span>
                                        <span className="text-slate-400 ml-1">— {doc.source}</span>
                                        {doc.notes && <span className="text-slate-400 ml-1 italic block">({doc.notes})</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
