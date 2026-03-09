
import React, { useMemo } from 'react';
import { BuildingData, Scenario, RetrofitMeasure } from '../types';
import { Button } from './Button';
import { Zap, TrendingUp, ShieldCheck, ArrowRight, Wallet, Percent, Thermometer, Calculator } from 'lucide-react';
import { getCarbonPriceForYear } from '../data/carbonPricing';

interface PathwaysViewProps {
  data: BuildingData;
  onSelectStrategy: (scenario: Scenario) => void;
  measuresCatalog: RetrofitMeasure[];
}

export const PathwaysView: React.FC<PathwaysViewProps> = ({ data, onSelectStrategy, measuresCatalog }) => {
    
    // Helper to build a Scenario object based on strategy
    const createStrategy = (type: 'light' | 'deep' | 'netzero' | 'budget') => {
        let measures: RetrofitMeasure[] = [];
        let name = "";
        let preset: Scenario['preset'] = 'custom';

        // Deep Copy Catalog
        const catalog = JSON.parse(JSON.stringify(measuresCatalog)) as RetrofitMeasure[];

        if (type === 'light') {
            name = "Light Touch (Quick Payback)";
            preset = 'light';
            measures = catalog.map(m => ({
                ...m,
                selected: (m.includedIn || []).includes('light')
            }));
        } else if (type === 'deep') {
            name = "Deep Retrofit (Comprehensive)";
            preset = 'deep';
            measures = catalog.map(m => ({
                ...m,
                selected: (m.includedIn || []).includes('deep')
            }));
        } else if (type === 'netzero') {
            name = "Net Zero Carbon";
            preset = 'netzero';
            measures = catalog.map(m => ({
                ...m,
                selected: (m.includedIn || []).includes('netzero')
            }));
        } else if (type === 'budget') {
            name = `Budget Optimized (< $${data.capitalBudget?.toLocaleString()})`;
            preset = 'custom';
            
            // Logic: Sort measures by ROI (Energy Savings Pct / Cost Per SqFt)
            // Greedily add until budget is exhausted
            const budget = data.capitalBudget || 0;
            let currentCost = 0;
            
            // Sort catalog by ROI descending
            const sortedCatalog = [...catalog].sort((a, b) => {
                const roiA = a.energySavingsPct / a.costPerSqFt;
                const roiB = b.energySavingsPct / b.costPerSqFt;
                return roiB - roiA;
            });

            measures = catalog.map(m => ({ ...m, selected: false }));
            
            for (const m of sortedCatalog) {
                const measureCost = m.costPerSqFt * data.areaSqFt;
                if (currentCost + measureCost <= budget) {
                    currentCost += measureCost;
                    const index = measures.findIndex(x => x.id === m.id);
                    if (index !== -1) measures[index].selected = true;
                }
            }
        }

        return {
            id: `strat-${type}-${Date.now()}`,
            name,
            measures,
            preset,
            carbonPrice: getCarbonPriceForYear(new Date().getFullYear(), data.province || 'ON'),
            inflationRate: 3,
            discountRate: 5
        } as Scenario;
    };

    const hasBudget = data.capitalBudget && data.capitalBudget > 0;

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-fadeIn">
            <header className="text-center max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 mb-3">Choose Your Retrofit Strategy</h1>
                <p className="text-slate-500">Select a strategic direction to pre-configure the engineering scope and capital stack. You can fine-tune individual measures in the next step.</p>
            </header>

            <div className={`grid grid-cols-1 md:grid-cols-${hasBudget ? '4' : '3'} gap-6`}>
                
                {/* 1. Light Touch */}
                <div 
                    onClick={() => onSelectStrategy(createStrategy('light'))}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col"
                >
                    <div className="bg-blue-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                        <Zap className="text-blue-600" size={24}/>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Light Touch</h3>
                    <p className="text-sm text-slate-500 mb-6 flex-1">
                        Maximize immediate cashflow with low-CapEx, short-payback measures like lighting and controls.
                    </p>
                    
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3 mb-6">
                        <div className="flex items-center text-sm font-semibold text-slate-700">
                            <Wallet size={16} className="mr-2 text-slate-400"/> Payback: Fast
                        </div>
                        <div className="flex items-center text-sm font-semibold text-slate-700">
                            <Percent size={16} className="mr-2 text-slate-400"/> Disruption: Low
                        </div>
                    </div>

                    <Button variant="outline" className="w-full group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600">
                        Select Strategy <ArrowRight size={16} className="ml-2"/>
                    </Button>
                </div>

                {/* 2. Deep Retrofit */}
                <div 
                    onClick={() => onSelectStrategy(createStrategy('deep'))}
                    className="bg-emerald-50 rounded-xl border-2 border-emerald-400 p-6 shadow-md cursor-pointer group flex flex-col relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase">
                        Recommended
                    </div>
                    <div className="bg-emerald-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition-colors">
                        <TrendingUp className="text-emerald-700" size={24}/>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Deep Retrofit</h3>
                    <p className="text-sm text-slate-600 mb-6 flex-1">
                        Comprehensive decarbonization targeting &gt;30% GHG reduction. Often unlocks CIB financing.
                    </p>
                    
                    <div className="bg-white/60 rounded-lg p-4 space-y-3 mb-6">
                        <div className="flex items-center text-sm font-semibold text-slate-800">
                            <Wallet size={16} className="mr-2 text-emerald-600"/> Payback: Medium
                        </div>
                        <div className="flex items-center text-sm font-semibold text-slate-800">
                            <TrendingUp size={16} className="mr-2 text-emerald-600"/> Asset Value: High
                        </div>
                    </div>

                    <Button variant="primary" className="w-full">
                        Select Strategy <ArrowRight size={16} className="ml-2"/>
                    </Button>
                </div>

                {/* 3. Net Zero */}
                <div 
                    onClick={() => onSelectStrategy(createStrategy('netzero'))}
                    className="bg-white rounded-xl border border-slate-200 p-6 hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col"
                >
                    <div className="bg-purple-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
                        <ShieldCheck className="text-purple-600" size={24}/>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Net Zero</h3>
                    <p className="text-sm text-slate-500 mb-6 flex-1">
                        Full electrification and envelope upgrades to eliminate scope 1 emissions and future-proof the asset.
                    </p>
                    
                    <div className="bg-slate-50 rounded-lg p-4 space-y-3 mb-6">
                        <div className="flex items-center text-sm font-semibold text-slate-700">
                            <Thermometer size={16} className="mr-2 text-purple-500"/> Carbon: Zero
                        </div>
                        <div className="flex items-center text-sm font-semibold text-slate-700">
                            <ShieldCheck size={16} className="mr-2 text-purple-500"/> Future Proof: Yes
                        </div>
                    </div>

                    <Button variant="outline" className="w-full group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600">
                        Select Strategy <ArrowRight size={16} className="ml-2"/>
                    </Button>
                </div>
                
                {/* 4. Budget Optimized (Only if budget provided) */}
                {hasBudget && (
                    <div 
                        onClick={() => onSelectStrategy(createStrategy('budget'))}
                        className="bg-white rounded-xl border border-slate-200 p-6 hover:border-amber-400 hover:shadow-lg transition-all cursor-pointer group flex flex-col"
                    >
                        <div className="bg-amber-50 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
                            <Calculator className="text-amber-600" size={24}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Budget Optimized</h3>
                        <p className="text-sm text-slate-500 mb-6 flex-1">
                            Maximizes ROI by selecting the most cost-effective measures that fit within your stated ${data.capitalBudget?.toLocaleString()} budget.
                        </p>
                        
                        <div className="bg-slate-50 rounded-lg p-4 space-y-3 mb-6">
                            <div className="flex items-center text-sm font-semibold text-slate-700">
                                <Wallet size={16} className="mr-2 text-amber-500"/> Fits Budget
                            </div>
                            <div className="flex items-center text-sm font-semibold text-slate-700">
                                <TrendingUp size={16} className="mr-2 text-amber-500"/> Max ROI
                            </div>
                        </div>

                        <Button variant="outline" className="w-full group-hover:bg-amber-600 group-hover:text-white group-hover:border-amber-600">
                            Select Strategy <ArrowRight size={16} className="ml-2"/>
                        </Button>
                    </div>
                )}

            </div>
        </div>
    );
};
