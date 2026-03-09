import React, { useState } from 'react';
import { Search, FileText, Download, AlertTriangle, Hammer } from 'lucide-react';
import { Button } from './Button';

export const DocsView: React.FC = () => {
    const [search, setSearch] = useState('');

    const docs = [
        { name: 'O&M Manual - Boiler.pdf', type: 'Manual', size: '2.4 MB' },
        { name: 'Installation Spec - Heat Pump.pdf', type: 'Spec', size: '1.1 MB' },
        { name: 'Structural Drawings - Roof.dwg', type: 'Drawing', size: '5.6 MB' },
        { name: 'Safety Protocol - Asbestos.pdf', type: 'Safety', size: '0.5 MB' },
    ];

    const filteredDocs = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <header className="border-b border-slate-200 pb-4 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Site Documentation</h1>
                    <p className="text-slate-500 text-sm mt-1">Access technical specs, manuals, and installation guides.</p>
                </div>
                <div className="bg-amber-50 text-amber-800 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 flex items-center">
                    <AlertTriangle size={12} className="mr-1"/> Active Site
                </div>
            </header>

            <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Search manuals, error codes, or specs..." 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredDocs.map((doc, i) => (
                    <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between hover:border-emerald-400 transition-colors group">
                        <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600">
                                <FileText size={20}/>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{doc.name}</h4>
                                <p className="text-xs text-slate-500">{doc.type} • {doc.size}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm">
                            <Download size={16} className="text-slate-400 group-hover:text-emerald-600"/>
                        </Button>
                    </div>
                ))}
            </div>

            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center">
                <Hammer className="mx-auto text-slate-400 mb-2" size={24}/>
                <h3 className="font-bold text-slate-700">Need Troubleshooting?</h3>
                <p className="text-sm text-slate-500 mb-4">Use the Chat Assistant to diagnose equipment error codes or find specific installation torque settings.</p>
            </div>
        </div>
    );
};