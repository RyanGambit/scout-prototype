import React, { useMemo } from 'react';
import { BuildingData, TabView } from '../types';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { ShieldAlert, AlertTriangle, CloudRain, Zap, TrendingUp, Building, ArrowRight } from 'lucide-react';
import { Button } from './Button';

interface RiskViewProps {
    data: BuildingData;
    onMitigate: (measureId: string) => void;
}

const RISK_DETAILS: Record<string, { description: string; mitigation: string; icon: React.ElementType }> = {
    'Equipment Failure': {
        description: 'Aging HVAC systems (>25 years) are prone to unexpected failure, leading to high emergency repair costs, operational downtime, and tenant disruption.',
        mitigation: "A 'Heat Pumps' upgrade replaces end-of-life systems with reliable, efficient technology, resetting the capital clock.",
        icon: TrendingUp,
    },
    'Carbon Liability': {
        description: 'High consumption of natural gas for heating creates a significant financial liability as carbon taxes escalate to $170/tonne and beyond.',
        mitigation: "Switching to electric 'Heat Pumps' can reduce GHG emissions by over 80%, neutralizing this financial risk.",
        icon: CloudRain,
    },
    'Grid Constraints': {
        description: 'Older buildings may lack the electrical service capacity to support full electrification, potentially requiring a costly service upgrade from the utility.',
        mitigation: "Combining electrification with an 'LED Upgrade' and other efficiency measures can reduce peak load, often avoiding a service upgrade.",
        icon: Zap,
    },
    'Envelope Failure': {
        description: 'Poorly insulated walls and single-pane windows lead to thermal discomfort, tenant complaints, and energy waste. They also increase the risk of moisture issues.',
        mitigation: "Upgrades like 'Triple Windows' and 'Overcladding' create a resilient thermal envelope, improving comfort and reducing energy costs.",
        icon: Building,
    },
    'Climate Resilience': {
        description: 'Lack of active cooling makes the building vulnerable to extreme heat waves, posing a health risk to occupants and potentially violating tenancy agreements.',
        mitigation: "'Heat Pumps' provide efficient cooling as a co-benefit of heating electrification, future-proofing the asset against rising temperatures.",
        icon: AlertTriangle,
    },
};

const riskToMeasureMap: Record<string, string> = {
    'Equipment Failure': 'heatpump',
    'Carbon Liability': 'heatpump',
    'Grid Constraints': 'led',
    'Envelope Failure': 'windows',
    'Climate Resilience': 'heatpump',
};

export const RiskView: React.FC<RiskViewProps> = ({ data, onMitigate }) => {
    
    const riskProfile = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const age = currentYear - (data.yearBuilt || currentYear);
        
        // Equipment Failure Risk
        let equipRisk = age > 50 ? 50 : age > 25 ? 30 : 10;
        const heatingSystem = data.heatingSystem || '';
        const coolingSystem = data.coolingSystem || '';
        if (heatingSystem.includes('<1990')) equipRisk += 40;
        if (coolingSystem === 'None' || coolingSystem.includes('Window')) equipRisk += 10;
        
        // Carbon Tax Exposure
        const gasEUI = data.gasUsage > 0 && data.areaSqFt > 0 ? (data.gasUsage * 10.55) / (data.areaSqFt / 10.764) : 0;
        let carbonRisk = heatingSystem.includes('Gas') || heatingSystem.includes('Boiler') 
            ? Math.min(100, 20 + (gasEUI / 150) * 80) // Base 20 risk, scales with gas intensity
            : 5;
        
        // Grid Constraints
        let gridRisk = age > 60 ? 70 : age > 40 ? 50 : 30;
        
        // Envelope Integrity
        let envelopeRisk = 20;
        const wallType = data.wallType || '';
        const windowType = data.windowType || '';
        if (wallType.includes('Uninsulated') || wallType.includes('Solid')) envelopeRisk += 40;
        if (windowType.includes('Single')) envelopeRisk += 40;
        
        // Climate Resilience
        let climateRisk = 30;
        if (coolingSystem === 'None') climateRisk += 50;

        return [
            { subject: 'Equipment Failure', A: Math.min(100, Math.round(equipRisk)), fullMark: 100 },
            { subject: 'Carbon Liability', A: Math.min(100, Math.round(carbonRisk)), fullMark: 100 },
            { subject: 'Grid Constraints', A: Math.min(100, Math.round(gridRisk)), fullMark: 100 },
            { subject: 'Envelope Failure', A: Math.min(100, Math.round(envelopeRisk)), fullMark: 100 },
            { subject: 'Climate Resilience', A: Math.min(100, Math.round(climateRisk)), fullMark: 100 },
        ];
    }, [data]);

    const overallRiskScore = Math.round(riskProfile.reduce((acc, curr) => acc + curr.A, 0) / 5);
    const highRisks = riskProfile.filter(r => r.A >= 50).sort((a,b) => b.A - a.A);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <header>
                <h1 className="text-2xl font-bold text-slate-900">Risk Assessment Radar</h1>
                <p className="text-slate-500 text-sm mt-1">Vulnerability analysis based on building archetype and systems age.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                    <h3 className="text-sm font-bold text-slate-700 w-full mb-4">Multi-Hazard Vulnerability Matrix</h3>
                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={riskProfile}>
                                <PolarGrid stroke="#e2e8f0" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Risk Level"
                                    dataKey="A"
                                    stroke="#ef4444"
                                    strokeWidth={3}
                                    fill="#ef4444"
                                    fillOpacity={0.2}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(val: number) => [`${val}/100`, 'Risk Score']}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={`p-6 rounded-xl border ${overallRiskScore > 60 ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div className="flex items-center space-x-3 mb-2">
                        <ShieldAlert size={24} className={overallRiskScore > 60 ? 'text-red-600' : 'text-amber-600'} />
                        <h3 className={`font-bold text-lg ${overallRiskScore > 60 ? 'text-red-900' : 'text-amber-900'}`}>
                            {overallRiskScore > 75 ? 'Critical Risk' : overallRiskScore > 50 ? 'High Risk' : 'Moderate Risk'}
                        </h3>
                    </div>
                    <p className={`text-4xl font-bold mb-2 ${overallRiskScore > 60 ? 'text-red-700' : 'text-amber-700'}`}>{overallRiskScore}/100</p>
                    <p className="text-xs opacity-80 leading-relaxed">
                        This building has a significant exposure to operational and asset-level risks. Immediate intervention is recommended to avoid stranded asset potential.
                    </p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4">Key Risk Drivers & Mitigation Paths</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {highRisks.length > 0 ? highRisks.map(item => {
                        const details = RISK_DETAILS[item.subject];
                        if (!details) return null;
                        const Icon = details.icon;
                        const isCritical = item.A > 75;
                        const measureId = riskToMeasureMap[item.subject];

                        return (
                            <div key={item.subject} className={`rounded-lg p-4 border flex flex-col justify-between ${isCritical ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center space-x-2">
                                            <Icon size={16} className={isCritical ? 'text-red-600' : 'text-amber-600'} />
                                            <p className="font-bold text-slate-800 text-sm">{item.subject}</p>
                                        </div>
                                        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.A}</span>
                                    </div>
                                    
                                    <p className="text-xs text-slate-600 leading-relaxed mb-3">{details.description}</p>
                                    
                                    <div className="mt-2 pt-2 border-t border-slate-200">
                                        <p className="text-[10px] text-emerald-700 uppercase font-bold">Mitigation Path</p>
                                        <p className="text-xs text-slate-500">{details.mitigation}</p>
                                    </div>
                                </div>
                                {measureId && (
                                    <div className="mt-4">
                                        <Button size="sm" variant="ghost" onClick={() => onMitigate(measureId)} className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 w-full justify-start">
                                            View Solution in Simulator <ArrowRight size={14} className="ml-auto" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )
                    }) : (
                        <div className="col-span-full text-center py-8 text-slate-500">
                            <p>No significant risks detected based on current data.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};