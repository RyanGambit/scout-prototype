import React, { useState } from 'react';
import { BuildingData, Scenario } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { ArrowRight, CheckCircle2, XCircle, AlertTriangle, GitCompare, TableProperties } from 'lucide-react';
import { Button } from './Button';

interface CompareViewProps {
    data: BuildingData;
}

export const CompareView: React.FC<CompareViewProps> = ({ data }) => {
    const savedScenarios = data.savedScenarios || [];
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const toggleScenario = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(s => s !== id));
        } else {
            if (selectedIds.length < 3) {
                setSelectedIds(prev => [...prev, id]);
            }
        }
    };

    // Prepare Data for Graph
    const comparisonData = selectedIds.map(id => {
        const scenario = savedScenarios.find(s => s.id === id);
        if (!scenario || !scenario.results) return null;
        return {
            name: scenario.name,
            EUI: scenario.results.eui,
            Carbon: Math.round(scenario.results.carbonTotal),
            CapEx: Math.round(scenario.results.totalCapEx / 1000) // in k$
        };
    }).filter(Boolean);

    // Filter full scenario objects for the table
    const selectedScenarios = savedScenarios.filter(s => selectedIds.includes(s.id));

    // If no scenarios are selected or saved, default to showing available ones or empty state
    if (savedScenarios.length === 0) {
        return (
            <div className="max-w-4xl mx-auto py-12 text-center">
                <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300">
                    <GitCompare className="mx-auto text-slate-400 mb-4" size={48} />
                    <h2 className="text-xl font-bold text-slate-800">No Saved Scenarios</h2>
                    <p className="text-slate-500 mt-2 mb-6">
                        Go to the <strong>Simulation</strong> tab and click "Save Scenario" to create snapshots for comparison.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fadeIn">
            <header className="border-b border-slate-200 pb-4">
                <h1 className="text-2xl font-bold text-slate-900">Scenario Comparison</h1>
                <p className="text-slate-500 text-sm mt-1">Select up to 3 scenarios to analyze trade-offs between capital cost, energy, and carbon.</p>
            </header>
            
            {/* Scenario Selector */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {savedScenarios.map(scenario => (
                    <div 
                        key={scenario.id}
                        onClick={() => toggleScenario(scenario.id)}
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${selectedIds.includes(scenario.id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-800 truncate">{scenario.name}</span>
                            {selectedIds.includes(scenario.id) && <CheckCircle2 size={16} className="text-emerald-500"/>}
                        </div>
                        <div className="text-xs text-slate-500 space-y-1">
                            <p>Preset: <span className="uppercase font-semibold">{scenario.preset}</span></p>
                            <p>{scenario.measures.filter(m => m.selected).length} Measures Selected</p>
                        </div>
                    </div>
                ))}
            </div>

            {selectedIds.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Graphs Column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4">Energy Use Intensity (kWh/m²)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false}/>
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}}/>
                                        <Tooltip cursor={{fill: 'transparent'}} />
                                        <Bar dataKey="EUI" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-4">Total CapEx ($k)</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={comparisonData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false}/>
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}}/>
                                        <Tooltip cursor={{fill: 'transparent'}} formatter={(val) => `$${val}k`}/>
                                        <Bar dataKey="CapEx" fill="#64748b" radius={[0, 4, 4, 0]} barSize={30} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Analysis Column */}
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                            <h4 className="font-bold text-slate-800 mb-4">Engineer's Compliance Check</h4>
                            {comparisonData?.map((d, i) => (
                                <div key={i} className="mb-4 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                                    <p className="font-bold text-sm text-slate-700 mb-2">{d?.name}</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <span>ASHRAE 90.1</span>
                                            {d && d.EUI < 150 
                                                ? <span className="flex items-center text-emerald-600 font-bold"><CheckCircle2 size={12} className="mr-1"/> Pass</span>
                                                : <span className="flex items-center text-amber-500 font-bold"><AlertTriangle size={12} className="mr-1"/> Review</span>
                                            }
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span>Net Zero Ready</span>
                                            {d && d.Carbon < 10 
                                                ? <span className="flex items-center text-emerald-600 font-bold"><CheckCircle2 size={12} className="mr-1"/> Yes</span>
                                                : <span className="flex items-center text-slate-400 font-bold"><XCircle size={12} className="mr-1"/> No</span>
                                            }
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Technical Detailed Table */}
                    <div className="col-span-full">
                         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                             <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                                 <TableProperties size={16} className="mr-2 text-slate-500"/>
                                 Technical Specifications
                             </h3>
                             <div className="overflow-x-auto">
                                 <table className="w-full text-sm">
                                     <thead>
                                         <tr className="bg-slate-50 text-left border-b border-slate-200">
                                             <th className="p-3 font-semibold text-slate-500 w-1/4">Parameter</th>
                                             {selectedScenarios.map(s => <th key={s.id} className="p-3 font-bold text-slate-900">{s.name}</th>)}
                                         </tr>
                                     </thead>
                                     <tbody>
                                         <tr className="border-b border-slate-100">
                                             <td className="p-3 text-slate-600 font-medium">Heat Pump COP</td>
                                             {selectedScenarios.map(s => {
                                                 const hp = s.measures.find(m => m.id === 'heatpump');
                                                 return <td key={s.id} className="p-3">{hp?.selected ? hp.cop || '3.0' : '-'}</td>
                                             })}
                                         </tr>
                                         <tr className="border-b border-slate-100">
                                             <td className="p-3 text-slate-600 font-medium">Wall/Roof Insulation (R-Value)</td>
                                             {selectedScenarios.map(s => {
                                                 const ins = s.measures.find(m => m.id === 'insulation');
                                                 return <td key={s.id} className="p-3">{ins?.selected ? `R-${ins.rValue}` : 'Existing'}</td>
                                             })}
                                         </tr>
                                         <tr className="border-b border-slate-100">
                                             <td className="p-3 text-slate-600 font-medium">Window Performance (U-Value)</td>
                                             {selectedScenarios.map(s => {
                                                 const win = s.measures.find(m => m.id === 'windows');
                                                 return <td key={s.id} className="p-3">{win?.selected ? win.uValue : 'Existing'}</td>
                                             })}
                                         </tr>
                                          <tr className="border-b border-slate-100">
                                             <td className="p-3 text-slate-600 font-medium">Carbon Price Assumption</td>
                                             {selectedScenarios.map(s => (
                                                 <td key={s.id} className="p-3">${s.carbonPrice}/t</td>
                                             ))}
                                         </tr>
                                          <tr>
                                             <td className="p-3 text-slate-600 font-medium">Inflation Rate</td>
                                             {selectedScenarios.map(s => (
                                                 <td key={s.id} className="p-3">{s.inflationRate || 3}%</td>
                                             ))}
                                         </tr>
                                     </tbody>
                                 </table>
                             </div>
                         </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p>Select scenarios above to visualize comparison.</p>
                </div>
            )}
        </div>
    );
};