import React, { useMemo, useState } from 'react';
import { BuildingData, SimulationContext, MaturityLevel } from '../types';
import { Button } from './Button';
import { Lock, TrendingUp, CheckCircle, AlertCircle, Banknote, Sparkles, X, XCircle, ArrowDown, DollarSign, Clock, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, AreaChart, Area } from 'recharts';
import { INCENTIVES, calculateIncentiveStack, IncentiveStackResult, MeasureCostInput } from '../data/incentives';
import { calculateAmortizingSchedule, calculateCibSavings, generateProForma, calculateNpvSensitivity, formatCurrency, formatPercent, ProFormaResult } from '../data/financialEngine';
import { getCarbonPriceForYear } from '../data/carbonPricing';
import { generateGrantApplication } from '../services/geminiService';
import { calculateBusinessCase, BusinessCaseResult } from '../data/businessCase';

interface FinancingViewProps {
    level: MaturityLevel;
    data: BuildingData;
    simulationContext?: SimulationContext;
}

export const FinancingView: React.FC<FinancingViewProps> = ({ level, data, simulationContext }) => {
    const isLocked = level < MaturityLevel.LEVEL_3;

    // Interactive State
    const [equityPct, setEquityPct] = useState(15);
    const [cibRateOverride, setCibRateOverride] = useState<number | null>(null);
    const [commercialRateOverride, setCommercialRateOverride] = useState<number | null>(null);
    const [amortYearsOverride, setAmortYearsOverride] = useState<number | null>(null);
    const [discountRate, setDiscountRate] = useState(0.075);
    const [showProForma, setShowProForma] = useState(false);

    // AI Grant Writer
    const [selectedGrantId, setSelectedGrantId] = useState<string | null>(null);
    const [aiDraft, setAiDraft] = useState("");
    const [isDrafting, setIsDrafting] = useState(false);
    const [showBusinessCase, setShowBusinessCase] = useState(false);

    // Simulation inputs
    const totalCapEx = simulationContext?.totalCapEx || 0;
    const annualSavings = simulationContext?.annualSavings || 0;
    const measures = simulationContext?.selectedMeasures || [];
    const ghgReduction = simulationContext?.ghgReduction || 0;
    const startYear = new Date().getFullYear();
    const province = data.province || 'ON';

    // CIB Eligibility
    const isCibEligible = ghgReduction >= 0.30;
    const cibRate = cibRateOverride ?? (isCibEligible ? 0.035 : 0.065);
    const commercialRate = commercialRateOverride ?? 0.065;
    const amortYears = amortYearsOverride ?? 20;

    // Build measure cost inputs for incentive engine
    const measureCostInputs: MeasureCostInput[] = useMemo(() => {
        if (!simulationContext) return [];
        const areaSqFt = data.areaSqFt || 41800;
        // Map selected measures to cost inputs
        return measures.map(name => {
            const id = name.toLowerCase().includes('heat pump') ? 'heatpump'
                : name.toLowerCase().includes('led') ? 'led'
                : name.toLowerCase().includes('solar') ? 'solar'
                : name.toLowerCase().includes('bas') || name.toLowerCase().includes('automation') ? 'bas'
                : name.toLowerCase().includes('submeter') ? 'submetering'
                : name.toLowerCase().includes('pipe') ? 'pipe-insulation'
                : name.toLowerCase().includes('panel') || name.toLowerCase().includes('electrical') ? 'electrical-panel'
                : name.toLowerCase().includes('dhw') ? 'dhw'
                : name.toLowerCase().replace(/\s+/g, '-');
            return {
                id,
                name,
                cost: totalCapEx / measures.length, // distribute evenly as estimate
                category: 'Mechanical',
            };
        });
    }, [simulationContext, measures, totalCapEx, data.areaSqFt]);

    // Calculate incentive stack
    const incentiveStack: IncentiveStackResult = useMemo(() => {
        if (!simulationContext || totalCapEx === 0) {
            return {
                eligibleIncentives: [], totalUpfront: 0, totalDelayed: 0,
                totalGrants: 0, ctItcAmount: 0, ctItcBasis: 0,
                bridgeFinancingTotal: 0, dayOneFinancedAmount: 0,
                netCapex: 0, incentiveCoverage: 0, cibEligible: false,
            };
        }
        return calculateIncentiveStack({
            measures: measureCostInputs,
            grossCapex: totalCapEx,
            province,
            ghgReduction,
            organizationType: data.organizationType,
            commercialRate,
            annualGasSavingsM3: data.gasUsage ? data.gasUsage * ghgReduction * 0.95 : 0,
            annualElecSavingsKwh: data.elecUsage ? data.elecUsage * 0.3 : 0,
            city: data.city,
            annualElecKwh: data.elecUsage || 0,
        });
    }, [simulationContext, totalCapEx, province, ghgReduction, measureCostInputs, commercialRate, data]);

    // Capital stack
    const dayOneFinanced = incentiveStack.dayOneFinancedAmount || (totalCapEx - incentiveStack.totalUpfront);
    const equityAmount = dayOneFinanced * (equityPct / 100);
    const loanPrincipal = dayOneFinanced - equityAmount;

    // CIB vs Commercial savings (amortizing!)
    const cibComparison = useMemo(() => {
        if (loanPrincipal <= 0) return null;
        return calculateCibSavings(loanPrincipal, cibRate, commercialRate, amortYears);
    }, [loanPrincipal, cibRate, commercialRate, amortYears]);

    // Pro Forma
    const proForma: ProFormaResult | null = useMemo(() => {
        if (loanPrincipal <= 0 || annualSavings <= 0) return null;
        
        // Use precise energy savings if available, otherwise estimate
        const energySavings = simulationContext?.energySavings || annualSavings * 0.58;
        
        const solarRevenue = measures.some(m => m.toLowerCase().includes('solar')) ? annualSavings * 0.19 : 0;
        const submeteringNOI = measures.some(m => m.toLowerCase().includes('submeter')) ? annualSavings * 0.13 : 0;
        
        // Use precise gas savings from context if available, otherwise estimate
        const gasSavingsM3 = simulationContext?.gasSavingsM3 !== undefined 
            ? simulationContext.gasSavingsM3 
            : (data.gasUsage ? data.gasUsage * ghgReduction * 0.95 : 0);

        return generateProForma({
            totalCapex: totalCapEx,
            equityPct,
            annualEnergySavings: energySavings,
            annualGasSavingsM3: gasSavingsM3,
            solarAnnualRevenue: solarRevenue,
            submeteringAnnualNOI: submeteringNOI,
            ctItcAmount: incentiveStack.ctItcAmount,
            bridgeFinancingCost: incentiveStack.bridgeFinancingTotal,
            upfrontGrants: incentiveStack.totalUpfront,
            loanPrincipal,
            loanRate: cibRate,
            loanYears: amortYears,
            discountRate,
            province,
            startYear,
        });
    }, [loanPrincipal, annualSavings, simulationContext, cibRate, amortYears, discountRate, equityPct, incentiveStack, totalCapEx, province, startYear, data, measures, ghgReduction]);

    // NPV Sensitivity
    const npvSensitivity = useMemo(() => {
        if (!proForma) return [];
        const cashflows = proForma.schedule.map(r => r.netCashflow);
        return calculateNpvSensitivity(cashflows, [0.05, 0.06, 0.075, 0.08, 0.09, 0.10]);
    }, [proForma]);

    // Asset value (v4 corrected: 7% cap rate, not 5%)
    const capRate = data.capRate || 0.07;
    const assetValueIncrease = annualSavings > 0 ? annualSavings / capRate : 0;

    // 9-Lever Business Case
    const businessCase: BusinessCaseResult | null = useMemo(() => {
        if (totalCapEx <= 0 || annualSavings <= 0) return null;
        const energySavings = annualSavings * 0.35;
        const solarRevenue = measures.some(m => m.toLowerCase().includes('solar')) ? annualSavings * 0.41 : 0;
        const solarCost = measures.some(m => m.toLowerCase().includes('solar'))
            ? measureCostInputs.find(m => m.id === 'solar')?.cost || 185000 : 0;
        return calculateBusinessCase({
            grossCapex: totalCapEx,
            netCapex: incentiveStack.netCapex || totalCapEx - incentiveStack.totalGrants,
            incentiveTotal: incentiveStack.totalGrants,
            cibRate,
            commercialRate,
            loanTerm: amortYears,
            annualEnergySavings: energySavings,
            annualSolarRevenue: solarRevenue,
            solarCapitalCost: solarCost,
            solarCtItc: solarCost > 0 ? Math.round(solarCost * 0.30 * 0.77) : 0,
            escalationRate: 0.02,
            capRate,
            rentPerSqft: data.rentPerSqft || 18,
            buildingSqft: data.areaSqFt || 41800,
            currentOccupancy: data.occupancy || 0.85,
            targetOccupancy: Math.min((data.occupancy || 0.85) + 0.05, 0.95),
            greenPremiumPct: 0.04,
            isTorontoBEPS: (data.city || '').toLowerCase() === 'toronto',
            boilerReplacementCost: 55000,
            ashpCost: measureCostInputs.find(m => m.id === 'heatpump')?.cost || 380000,
            ashpIncentives: 166000,
            ctItcAmount: incentiveStack.ctItcAmount,
            submeteringCost: 27500,
        });
    }, [totalCapEx, annualSavings, measures, measureCostInputs, incentiveStack, cibRate, commercialRate, amortYears, capRate, data]);

    // Chart data
    const chartData = useMemo(() => {
        if (!proForma) return [];
        return proForma.schedule.filter(r => r.year >= 0).map(r => ({
            year: r.year,
            savings: r.totalSavings,
            debt: r.debtService,
            cumulative: r.cumulativeCash,
            ctItc: r.ctItcRefund,
        }));
    }, [proForma]);

    // Grant writer
    const activeGrant = incentiveStack.eligibleIncentives.find(i => i.incentive.id === selectedGrantId);
    const handleDraftNarrative = async () => {
        if (!activeGrant) return;
        setIsDrafting(true);
        try {
            const text = await generateGrantApplication(activeGrant.incentive.name, data, simulationContext);
            setAiDraft(text);
        } catch (e) { setAiDraft("Error generating draft."); }
        finally { setIsDrafting(false); }
    };

    if (isLocked) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                <Lock className="text-slate-400 mb-6" size={32} />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Financing Locked</h2>
                <p className="text-slate-500 max-w-md">Complete simulation to unlock capital planning.</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fadeIn">
            <header className="flex justify-between items-end border-b border-slate-200 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Investment Analysis</h1>
                    <p className="text-slate-500 mt-1">Capital stack, cashflow projection, and valuation impact.</p>
                </div>
                <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg shadow-md">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Gross Project</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalCapEx)}</p>
                    </div>
                </div>
            </header>

            {/* Bridge Financing Warning */}
            {incentiveStack.ctItcAmount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
                    <div>
                        <h4 className="font-bold text-amber-900">CT ITC Bridge Financing Required</h4>
                        <p className="text-sm text-amber-800 mt-1">
                            The {formatCurrency(incentiveStack.ctItcAmount)} Clean Technology ITC is claimed on T2 tax return (~12 months after equipment becomes available for use).
                            Day-1 financed amount is {formatCurrency(dayOneFinanced)}, not {formatCurrency(totalCapEx - incentiveStack.totalGrants)}.
                            Bridge cost: <strong>{formatCurrency(incentiveStack.bridgeFinancingTotal)}</strong> at {(commercialRate * 100).toFixed(1)}% for 12 months.
                        </p>
                    </div>
                </div>
            )}

            {/* TOP ROW: Chart + Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cashflow Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center">
                            <TrendingUp size={20} className="mr-2 text-emerald-600" /> {amortYears}-Year Cumulative Cashflow
                        </h3>
                        <div className="flex gap-4 text-xs">
                            <div className="flex items-center"><div className="w-3 h-3 bg-emerald-500 rounded-sm mr-2"></div>Cumulative</div>
                            <div className="flex items-center"><div className="w-3 h-3 bg-blue-400 rounded-sm mr-2"></div>Savings</div>
                            <div className="flex items-center"><div className="w-3 h-3 bg-slate-300 rounded-sm mr-2"></div>Debt</div>
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                                <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                                <Bar dataKey="debt" stackId="a" fill="#e2e8f0" barSize={12} name="Debt Service" />
                                <Bar dataKey="savings" stackId="a" fill="#3b82f6" barSize={12} radius={[4, 4, 0, 0]} name="Total Savings" />
                                {chartData.some(d => d.ctItc > 0) && <Bar dataKey="ctItc" fill="#f59e0b" barSize={6} name="CT ITC Refund" />}
                                <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={3} dot={false} name="Cumulative Cash" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Key Metrics */}
                <div className="space-y-4">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-1">Asset Value Increase</h3>
                        <p className="text-3xl font-bold mb-1">{formatCurrency(assetValueIncrease)}</p>
                        <p className="text-xs text-slate-400">NOI increase @ {(capRate * 100).toFixed(0)}% Cap Rate</p>
                        <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase">NPV @ {(discountRate * 100).toFixed(1)}%</p>
                                <p className={`text-xl font-bold ${proForma && proForma.npv > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {proForma ? formatCurrency(proForma.npv) : '-'}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 font-bold uppercase">IRR</p>
                                <p className="text-xl font-bold text-blue-400">{proForma ? formatPercent(proForma.irr) : '-'}</p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-700">
                            <p className="text-xs text-slate-400 font-bold uppercase">Payback</p>
                            <p className="text-lg font-bold text-white">Year {proForma?.paybackYear || '-'}</p>
                        </div>
                    </div>

                    {/* NPV Sensitivity */}
                    {npvSensitivity.length > 0 && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">NPV Sensitivity</h3>
                            <div className="space-y-2">
                                {npvSensitivity.map(({ rate, npv }) => (
                                    <div key={rate} className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">@ {(rate * 100).toFixed(1)}%</span>
                                        <span className={`font-bold ${npv > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {formatCurrency(npv)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            {npvSensitivity.every(s => s.npv > 0) && (
                                <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700 font-bold text-center">
                                    NPV-positive at all discount rates up to 10%
                                </div>
                            )}
                        </div>
                    )}

                    {/* CIB Savings */}
                    {cibComparison && isCibEligible && (
                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                            <h3 className="text-sm font-bold text-emerald-800 mb-2">CIB Interest Savings</h3>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-emerald-700">Year 1:</span>
                                <span className="font-bold text-emerald-800">{formatCurrency(cibComparison.year1Savings)}</span>
                            </div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-emerald-700">Year {amortYears}:</span>
                                <span className="font-bold text-emerald-800">{formatCurrency(cibComparison.year20Savings)}</span>
                            </div>
                            <div className="flex justify-between text-xs pt-2 border-t border-emerald-200 mt-2">
                                <span className="text-emerald-700 font-bold">Lifetime:</span>
                                <span className="font-bold text-emerald-900">{formatCurrency(cibComparison.lifetimeSavings)}</span>
                            </div>
                            <p className="text-[10px] text-emerald-600 mt-2">Amortizing calculation (not flat annual)</p>
                        </div>
                    )}
                </div>
            </div>

            {/* BOTTOM ROW: Config + Incentives */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Loan Configuration */}
                <div className="space-y-6">
                    <h3 className="font-bold text-slate-800 flex items-center text-lg">
                        <DollarSign size={20} className="mr-2 text-slate-400" /> Loan Configuration
                    </h3>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                        <div className={`flex items-start p-4 rounded-lg border ${isCibEligible ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                            {isCibEligible ? <CheckCircle className="text-emerald-500 mt-1 mr-3 flex-shrink-0" size={20} /> : <AlertCircle className="text-slate-400 mt-1 mr-3 flex-shrink-0" size={20} />}
                            <div>
                                <h4 className={`font-bold ${isCibEligible ? 'text-emerald-900' : 'text-slate-700'}`}>
                                    {isCibEligible ? "CIB Growth Retrofit Qualified" : "Standard Commercial Debt"}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    {isCibEligible ? `Project achieves ${(ghgReduction * 100).toFixed(0)}% GHG reduction (> 30% threshold).` : "Below 30% GHG threshold for CIB."}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-bold text-slate-700">{isCibEligible ? 'CIB Rate' : 'Interest Rate'}</label>
                                    <span className="text-sm font-bold text-blue-600">{(cibRate * 100).toFixed(1)}%</span>
                                </div>
                                <input type="range" min="1" max="8" step="0.25" value={cibRate * 100}
                                    onChange={(e) => setCibRateOverride(Number(e.target.value) / 100)}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            {isCibEligible && (
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <label className="text-sm font-bold text-slate-700">Commercial Benchmark</label>
                                        <span className="text-sm font-bold text-slate-500">{(commercialRate * 100).toFixed(1)}%</span>
                                    </div>
                                    <input type="range" min="4" max="12" step="0.25" value={commercialRate * 100}
                                        onChange={(e) => setCommercialRateOverride(Number(e.target.value) / 100)}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-400" />
                                </div>
                            )}
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-bold text-slate-700">Amortization</label>
                                    <span className="text-sm font-bold text-blue-600">{amortYears} Years</span>
                                </div>
                                <input type="range" min="5" max="30" step="5" value={amortYears}
                                    onChange={(e) => setAmortYearsOverride(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-bold text-slate-700">Owner Equity</label>
                                    <span className="text-sm font-bold text-blue-600">{equityPct}% ({formatCurrency(equityAmount)})</span>
                                </div>
                                <input type="range" min="0" max="50" step="5" value={equityPct}
                                    onChange={(e) => setEquityPct(Number(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm font-bold text-slate-700">Discount Rate (WACC)</label>
                                    <span className="text-sm font-bold text-blue-600">{(discountRate * 100).toFixed(1)}%</span>
                                </div>
                                <input type="range" min="3" max="15" step="0.5" value={discountRate * 100}
                                    onChange={(e) => setDiscountRate(Number(e.target.value) / 100)}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                        </div>

                        {/* Capital Stack Summary */}
                        <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-slate-500">Gross CapEx</span><span className="font-bold">{formatCurrency(totalCapEx)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">- Upfront Grants</span><span className="font-bold text-emerald-600">({formatCurrency(incentiveStack.totalUpfront)})</span></div>
                            <div className="flex justify-between border-t border-slate-200 pt-2"><span className="text-slate-700 font-bold">Day-1 Financed</span><span className="font-bold">{formatCurrency(dayOneFinanced)}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">- Owner Equity</span><span className="font-bold">({formatCurrency(equityAmount)})</span></div>
                            <div className="flex justify-between border-t border-slate-200 pt-2"><span className="text-slate-700 font-bold">Loan Principal</span><span className="font-bold">{formatCurrency(loanPrincipal)}</span></div>
                            {incentiveStack.ctItcAmount > 0 && (
                                <div className="flex justify-between text-amber-700 bg-amber-50 p-2 rounded mt-2">
                                    <span>CT ITC (Year 1 refund)</span>
                                    <span className="font-bold">{formatCurrency(incentiveStack.ctItcAmount)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Incentive Stack */}
                <div className="space-y-6">
                    <h3 className="font-bold text-slate-800 flex items-center text-lg">
                        <Banknote size={20} className="mr-2 text-slate-400" /> Incentive Stack
                    </h3>
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col" style={{ maxHeight: '600px' }}>
                        <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold uppercase text-slate-500">Total Incentives</span>
                                <span className="font-bold text-amber-600">{formatCurrency(incentiveStack.totalGrants)}</span>
                            </div>
                            <div className="flex gap-4 text-xs">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></div>
                                    Upfront: {formatCurrency(incentiveStack.totalUpfront)}
                                </div>
                                <div className="flex items-center">
                                    <div className="w-2 h-2 bg-amber-500 rounded-full mr-1"></div>
                                    Delayed: {formatCurrency(incentiveStack.totalDelayed)}
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Coverage: {(incentiveStack.incentiveCoverage * 100).toFixed(1)}% of gross CapEx</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {incentiveStack.eligibleIncentives.filter(ei => ei.eligible).map(ei => (
                                <div
                                    key={ei.incentive.id}
                                    onClick={() => setSelectedGrantId(ei.incentive.id)}
                                    className="p-3 rounded-lg border text-sm transition-all cursor-pointer group bg-white border-slate-200 hover:border-emerald-400 hover:shadow-sm"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center">
                                            <CheckCircle size={16} className="text-emerald-500 mr-2" />
                                            <span className="font-bold text-slate-800 group-hover:text-emerald-700">{ei.incentive.name}</span>
                                        </div>
                                        <span className="font-mono font-bold text-amber-600">
                                            {ei.amount > 0 ? formatCurrency(ei.amount) : 'Variable/Financing'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2 pl-6">
                                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{ei.incentive.type}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                            ei.timing === 'upfront' ? 'bg-emerald-100 text-emerald-700' :
                                            ei.timing === 'tax-filing' ? 'bg-amber-100 text-amber-700' :
                                            ei.timing === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                                            'bg-slate-100 text-slate-600'
                                        }`}>
                                            {ei.timing === 'upfront' ? 'Upfront' :
                                             ei.timing === 'tax-filing' ? `Tax Filing (~${ei.incentive.claimDelay || 12}mo)` :
                                             ei.timing === 'post-completion' ? `Post-Completion (~${ei.incentive.claimDelay || 6}mo)` :
                                             'Ongoing'}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                            ei.incentive.complexity === 'low' ? 'bg-green-100 text-green-700' :
                                            ei.incentive.complexity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {ei.incentive.complexity} complexity
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 pl-6 mt-1">{ei.incentive.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Pro Forma Toggle */}
            {proForma && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setShowProForma(!showProForma)}
                        className="w-full p-4 flex justify-between items-center hover:bg-slate-50 transition-colors rounded-xl"
                    >
                        <h3 className="font-bold text-slate-800">{amortYears}-Year Pro Forma Detail</h3>
                        {showProForma ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    {showProForma && (
                        <div className="p-4 border-t border-slate-100 overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-slate-50 text-left">
                                        <th className="p-2 font-bold text-slate-500">Year</th>
                                        <th className="p-2 font-bold text-slate-500">Energy Savings</th>
                                        <th className="p-2 font-bold text-slate-500">Carbon Avoided</th>
                                        <th className="p-2 font-bold text-slate-500">Solar</th>
                                        <th className="p-2 font-bold text-slate-500">Submetering</th>
                                        <th className="p-2 font-bold text-slate-500">Total Savings</th>
                                        <th className="p-2 font-bold text-slate-500">Debt Service</th>
                                        <th className="p-2 font-bold text-slate-500">CT ITC</th>
                                        <th className="p-2 font-bold text-slate-500">Net Cash</th>
                                        <th className="p-2 font-bold text-slate-500">Cumulative</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {proForma.schedule.map(r => (
                                        <tr key={r.year} className={`border-t border-slate-100 ${r.cumulativeCash >= 0 && r.year > 0 && proForma.schedule[Math.max(0, proForma.schedule.indexOf(r) - 1)]?.cumulativeCash < 0 ? 'bg-emerald-50' : ''}`}>
                                            <td className="p-2 font-bold">{r.year}</td>
                                            <td className="p-2">{formatCurrency(r.energySavings)}</td>
                                            <td className="p-2">{formatCurrency(r.carbonAvoidance)}</td>
                                            <td className="p-2">{formatCurrency(r.solarRevenue)}</td>
                                            <td className="p-2">{formatCurrency(r.submeteringNOI)}</td>
                                            <td className="p-2 font-bold text-emerald-600">{formatCurrency(r.totalSavings)}</td>
                                            <td className="p-2 text-red-500">({formatCurrency(r.debtService)})</td>
                                            <td className="p-2 text-amber-600">{r.ctItcRefund > 0 ? formatCurrency(r.ctItcRefund) : '-'}</td>
                                            <td className={`p-2 font-bold ${r.netCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(r.netCashflow)}</td>
                                            <td className={`p-2 font-bold ${r.cumulativeCash >= 0 ? 'text-emerald-600' : 'text-slate-600'}`}>{formatCurrency(r.cumulativeCash)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* =============================================== */}
            {/* 9-LEVER BUSINESS CASE                          */}
            {/* =============================================== */}
            {businessCase && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                    <button
                        onClick={() => setShowBusinessCase(!showBusinessCase)}
                        className="w-full p-4 flex justify-between items-center hover:bg-slate-50 transition-colors rounded-xl"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-100 p-2 rounded-lg"><TrendingUp className="text-indigo-600" size={20} /></div>
                            <div className="text-left">
                                <h3 className="font-bold text-slate-800">9-Lever Business Case</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Conservative: {formatCurrency(businessCase.conservativeTotal)} ({businessCase.conservativeMultiple.toFixed(1)}×)
                                    &nbsp;|&nbsp; Base: {formatCurrency(businessCase.baseCaseTotal)} ({businessCase.baseCaseMultiple.toFixed(1)}×)
                                </p>
                            </div>
                        </div>
                        {showBusinessCase ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    {showBusinessCase && (
                        <div className="p-6 border-t border-slate-100 space-y-6">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                <p className="text-sm text-indigo-900 italic">
                                    The business case cannot rest on utility bill savings alone. Nine independently verifiable levers produce returns of 4-7× over 20 years.
                                </p>
                            </div>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Conservative Value</p>
                                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(businessCase.conservativeTotal)}</p>
                                    <p className="text-xs text-slate-400 mt-1">{businessCase.conservativeMultiple.toFixed(1)}x ROI</p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Base Case Value</p>
                                    <p className="text-2xl font-bold text-emerald-700">{formatCurrency(businessCase.baseCaseTotal)}</p>
                                    <p className="text-xs text-emerald-600/70 mt-1">{businessCase.baseCaseMultiple.toFixed(1)}x ROI</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {businessCase.levers.map(l => (
                                    <div key={l.id} className={`relative bg-white rounded-xl border p-4 transition-all hover:shadow-md ${!l.isAdditive ? 'border-slate-200 bg-slate-50/50' : 'border-slate-200'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-full">L{l.leverNumber}</span>
                                                <h4 className="font-bold text-slate-900 text-sm">{l.name}</h4>
                                                {!l.isAdditive && <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Structural</span>}
                                            </div>
                                            <div className="text-right">
                                                {l.isQuantified ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="font-bold text-slate-900 text-sm">{formatCurrency(l.baseCaseEstimate)}</span>
                                                        {l.conservativeEstimate !== l.baseCaseEstimate && (
                                                            <span className="text-[10px] text-slate-400">Low: {formatCurrency(l.conservativeEstimate)}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Qualitative</span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-100">
                                            <div className="md:col-span-2">
                                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                                    <span className="font-bold text-slate-700">Basis:</span> {l.basis}
                                                </p>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1 mb-1">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Bankability</span>
                                                    <div className="flex">
                                                        {'★'.repeat(l.bankabilityRating)}{'☆'.repeat(5 - l.bankabilityRating)}
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-slate-500">{l.bankabilityLabel}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                <span className="text-sm font-bold text-slate-500">Net Project Cost</span>
                                <span className="text-sm font-bold text-red-600">({formatCurrency(businessCase.netProjectCost)})</span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Grant Writer Modal */}
            {selectedGrantId && activeGrant && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center animate-fadeIn p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 relative">
                        <button onClick={() => { setSelectedGrantId(null); setAiDraft(''); }} className="absolute top-4 right-4 text-slate-400"><X size={20} /></button>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">{activeGrant.incentive.name}</h3>
                        <p className="text-sm text-slate-500 mb-4">AI Grant Writer</p>
                        {!aiDraft ? (
                            <Button onClick={handleDraftNarrative} isLoading={isDrafting} className="w-full">
                                <Sparkles size={16} className="mr-2" /> Generate Application Narrative
                            </Button>
                        ) : (
                            <div className="space-y-3">
                                <textarea readOnly value={aiDraft} className="w-full h-40 p-3 text-sm bg-slate-50 border rounded-lg outline-none" />
                                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(aiDraft); }}>Copy to Clipboard</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
