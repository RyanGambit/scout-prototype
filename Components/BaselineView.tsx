
import React, { useState, useMemo } from 'react';
import { BuildingData, MaturityLevel, TabView, Persona, Priority } from '../types';
import { UploadCloud, CheckCircle, Info, MapPin, Sparkles, AlertCircle, ChevronDown, ChevronRight, ChevronLeft, User, Target, X, Loader, AlertTriangle, Stethoscope, Lightbulb, FileText, BarChart3 } from 'lucide-react';
import { Button } from './Button';
import { verifyAttributeWithAI } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { generateMonthlyProfile } from '../data/energyProfile';

interface BaselineViewProps {
  data: BuildingData;
  setData: React.Dispatch<React.SetStateAction<BuildingData>>;
  level: MaturityLevel;
  setLevel: (l: MaturityLevel) => void;
  onTabChange: (tab: TabView) => void;
}

// Comprehensive Option Lists
const OPTIONS = {
    province: [
        'ON', 'BC', 'AB', 'QC', 'NS', 'NB', 'MB', 'PE', 'SK', 'NL', 'YT', 'NT', 'NU'
    ],
    archetype: [
        'High Rise Office', 'Low Rise Office', 
        'High Rise MURB (Residential)', 'Low Rise MURB (Residential)', 'Townhouse Complex',
        'Retail Strip', 'Big Box Retail', 'Shopping Mall',
        'Warehouse', 'Light Industrial', 'Data Center',
        'School (Primary)', 'School (Secondary)', 'University / College',
        'Healthcare / Clinic', 'Hospital',
        'Hotel', 'Community Center', 'Place of Worship'
    ],
    wallType: [
        'Pre-cast Concrete (Uninsulated)', 'Pre-cast Concrete (Insulated)',
        'Brick Masonry (Solid)', 'Brick Veneer / Steel Stud',
        'Curtain Wall (Single Glazed)', 'Curtain Wall (Double Glazed)',
        'EIFS (Exterior Insulation)', 'Metal Cladding',
        'Concrete Block (CMU)', 'Wood Siding'
    ],
    roofType: [
        'BUR (Built-up Roof)', 'Mod-Bit (Modified Bitumen)',
        'EPDM Membrane', 'TPO / PVC Single Ply',
        'Inverted Roof (Protected Membrane)', 'Green Roof',
        'Metal Deck / Standing Seam', 'Shingle (Asphalt)'
    ],
    windowType: [
        'Single Pane (Aluminum)', 'Single Pane (Wood)',
        'Double Pane (Aluminum - Non-thermally broken)', 'Double Pane (Aluminum - Thermally broken)',
        'Double Pane (Vinyl)', 'Double Pane (Wood)',
        'Triple Pane (High Performance)', 'Vacuum Insulated Glass'
    ],
    heatingSystem: [
        'Natural Gas Boiler (Non-Condensing, <1990)', 'Natural Gas Boiler (Non-Condensing, >1990)',
        'Natural Gas Boiler (Condensing)', 'Atmospheric Gas Boiler', 'Steam Boiler (Natural Gas)',
        'Electric Baseboard', 'Electric Furnace', 'Electric Boiler',
        'Heat Pump (Air Source - Split)', 'Heat Pump (Air Source - VRF)',
        'Heat Pump (Water Source)', 'District Heating (Steam)', 'District Heating (Hot Water)'
    ],
    coolingSystem: [
        'None', 'Window Units', 'PTAC (Through Wall)',
        'Split Systems (DX)', 'Rooftop Units (RTU)',
        'Chiller (Air Cooled)', 'Chiller (Water Cooled)',
        'Heat Pump (VRF)', 'District Cooling'
    ],
    ventilationSystem: [
        'Natural (Operable Windows)', 'Exhaust Only',
        'Constant Volume (CAV)', 'VAV with Reheat',
        'Dedicated Outdoor Air (DOAS)', 'Make-up Air Unit (MUA)',
        'Energy Recovery Ventilator (ERV)'
    ]
};

const STEPS = [
    { id: 0, title: "Onboarding", desc: "Define your goals" },
    { id: 1, title: "Digital Locker", desc: "Ingest reports" },
    { id: 2, title: "Site & Geometry", desc: "Basic parameters" },
    { id: 3, title: "Building Envelope", desc: "Thermal performance" },
    { id: 4, title: "Mechanical Systems", desc: "HVAC equipment" },
    { id: 5, title: "Energy Data", desc: "Utility validation" }
];

const PERSONA_OPTIONS: Persona[] = ['Owner / Manager', 'Engineer / Architect', 'Workforce / Trades'];
const PRIORITY_OPTIONS: Priority[] = ['Reduce Bills', 'Fix Comfort/Drafts', 'Net Zero Compliance', 'Capital Renewal'];

type VerificationResult = { suggestedValue: any, reasoning: string, confidence: number };

export const BaselineView: React.FC<BaselineViewProps> = ({ data, setData, level, setLevel, onTabChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const [verifyingField, setVerifyingField] = useState<keyof BuildingData | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult & { field: keyof BuildingData } | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const [isUploadingPlan, setIsUploadingPlan] = useState(false);

  
  const validateField = (name: keyof BuildingData, value: any): string => {
    switch (name) {
        case 'yearBuilt':
            const currentYear = new Date().getFullYear();
            if (!value || value < 1800 || value > currentYear) return `Year must be between 1800 and ${currentYear}`;
            return "";
        case 'areaSqFt':
            if (!value || value <= 0) return "Area must be greater than 0";
            return "";
        case 'stories':
            if (!value || value <= 0) return "Stories must be at least 1";
            if (value > 150) return "Stories seems too high";
            return "";
        case 'windowWallRatio':
            if (value < 0 || value > 100) return "Must be between 0% and 100%";
            return "";
        default:
            return "";
    }
  };

  const handleBlur = (field: keyof BuildingData) => {
      setTouched(prev => ({...prev, [field]: true}));
      const error = validateField(field, data[field]);
      setErrors(prev => ({...prev, [field]: error}));
  };

  const handleVerifyField = async (field: keyof BuildingData) => {
      setVerificationError(null);
      setVerificationResult(null);
      setVerifyingField(field);
      try {
          const result = await verifyAttributeWithAI(data.address, field, data[field]);
          setVerificationResult({ ...result, field });
      } catch (e: any) {
          setVerificationError(e.message || "An unknown error occurred.");
      } finally {
          setVerifyingField(null);
      }
  };
  
  const applyVerification = () => {
      if (verificationResult) {
          handleChange(verificationResult.field, verificationResult.suggestedValue);
          setVerificationResult(null);
      }
  };

  // Mock Document Parsing
  const handleCapitalPlanUpload = () => {
      setIsUploadingPlan(true);
      setTimeout(() => {
          setData(prev => ({
              ...prev,
              capitalPlanUploaded: true,
              yearBuilt: 1985,
              heatingSystem: 'Atmospheric Gas Boiler',
              wallType: 'Brick Masonry (Solid)',
              windowType: 'Single Pane (Aluminum)',
              isEstimate: false
          }));
          setIsUploadingPlan(false);
      }, 1500);
  };

  const handleSimulateUpload = () => {
    // DETERMINISTIC HEURISTICS with REGIONAL & ARCHETYPE AWARENESS
    // (Logic preserved from original BaselineView for EUI sim)
    
    // If the AI already populated elecUsage and gasUsage during the initial search, use those.
    // Otherwise, generate deterministic mock values based on area.
    const newElec = data.elecUsage > 0 ? data.elecUsage : Math.round(data.areaSqFt * 10);
    const newGas = data.gasUsage > 0 ? data.gasUsage : Math.round(data.areaSqFt * 2);
    
    // Generate Monthly Data
    const tempData = { ...data, elecUsage: newElec, gasUsage: newGas };
    const monthlyData = generateMonthlyProfile(tempData);
    
    // Calculate a rough EUI (ekWh/sqft)
    const totalEkWh = newElec + (newGas * 10.32); // 1 m3 gas = ~10.32 ekWh
    const calculatedEui = Math.round(totalEkWh / data.areaSqFt);

    setTimeout(() => {
      setData(prev => ({ 
          ...prev, 
          utilityBillUploaded: true, 
          energyConsumption: calculatedEui, // Use calculated EUI
          elecUsage: newElec,
          gasUsage: newGas,
          monthlyData: monthlyData
      }));
      if (level < MaturityLevel.LEVEL_2) setLevel(MaturityLevel.LEVEL_2);
    }, 1200);
  };

  const handleChange = (field: keyof BuildingData, value: string | number | Persona | Priority) => {
    setData(prev => ({ ...prev, [field]: value }));
    if (touched[field] || errors[field]) {
        const error = validateField(field, value);
        setErrors(prev => ({...prev, [field]: error}));
    }
    if (level < MaturityLevel.LEVEL_1) setLevel(MaturityLevel.LEVEL_1);
  };

  const handleNext = () => {
      if (currentStep < 5) {
          if (currentStep === 0 && (!data.persona || !data.priority)) {
              alert("Please select your role and top priority to continue.");
              return;
          }
          setCurrentStep(currentStep + 1);
      } else {
          // Go to PATHWAYS instead of Simulation directly
          onTabChange(TabView.PATHWAYS);
      }
  };

  const handleBack = () => {
      if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const renderInput = (label: string, field: keyof BuildingData, type: 'text' | 'number' = 'text', optionsListKey?: keyof typeof OPTIONS) => {
      const error = errors[field];
      const isTouched = touched[field];
      const hasError = isTouched && !!error;
      const isVerifying = verifyingField === field;
      
      let options: string[] | undefined = undefined;
      if (optionsListKey) {
          options = [...OPTIONS[optionsListKey]];
          const currentVal = data[field] as string;
          if (currentVal && !options.includes(currentVal)) {
              options.unshift(currentVal); 
          }
      }

      return (
        <div className="relative group">
            <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-500">{label}</label>
                 <button 
                    onClick={() => handleVerifyField(field)}
                    disabled={!!verifyingField}
                    className="flex items-center space-x-1 text-xs text-emerald-600 hover:text-emerald-800 disabled:opacity-50 disabled:cursor-wait transition-opacity duration-200 opacity-0 focus-within:opacity-100 group-hover:opacity-100"
                    title="Verify with Scout AI"
                >
                    {isVerifying ? (
                        <Loader size={12} className="animate-spin" />
                    ) : (
                        <Sparkles size={12} />
                    )}
                    <span>{isVerifying ? 'Verifying...' : 'Verify'}</span>
                </button>
            </div>
            
            {options ? (
                <div className="relative">
                     <select 
                        value={data[field] as string}
                        onChange={(e) => handleChange(field, e.target.value)}
                        onBlur={() => handleBlur(field)}
                        className={`w-full bg-slate-50 border rounded-lg pl-3 pr-8 py-2 text-sm text-slate-900 focus:ring-2 outline-none transition-all appearance-none
                            ${hasError 
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200'
                            }`}
                    >
                        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={14} />
                </div>
            ) : (
                <div className="relative">
                    <input 
                        type={type}
                        value={data[field] as string | number}
                        onChange={(e) => handleChange(field, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                        onBlur={() => handleBlur(field)}
                        className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm text-slate-900 focus:ring-2 outline-none transition-all
                            ${hasError 
                                ? 'border-red-300 focus:border-red-500 focus:ring-red-200 pr-10' 
                                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200'
                            }`}
                    />
                    {hasError && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <AlertCircle className="h-4 w-4 text-red-500" />
                        </div>
                    )}
                </div>
            )}
            {hasError && (
                <p className="mt-1 text-xs text-red-500 animate-fadeIn">{error}</p>
            )}
        </div>
      );
  };
  
  const renderVerificationModal = () => {
    if (!verificationResult && !verificationError) return null;
    const close = () => {
        setVerificationError(null);
        setVerificationResult(null);
    };
    return (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center animate-fadeIn">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 m-4 relative">
                 <button onClick={close} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={18}/></button>
                 {verificationError ? (
                    <>
                        <div className="flex items-center space-x-3 mb-4">
                            <AlertCircle className="text-red-500" size={24}/>
                            <h2 className="text-lg font-bold text-slate-900">Verification Failed</h2>
                        </div>
                        <p className="text-sm text-slate-600">{verificationError}</p>
                        <div className="mt-6 flex justify-end">
                             <Button variant="secondary" onClick={close}>Close</Button>
                        </div>
                    </>
                ) : verificationResult && (
                    <>
                         <div className="flex items-center space-x-3 mb-4">
                            <Sparkles className="text-emerald-500" size={24}/>
                            <h2 className="text-lg font-bold text-slate-900">Verification Complete</h2>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                             <div>
                                <p className="text-xs text-slate-500 font-semibold">Suggested Value</p>
                                <p className="font-bold text-emerald-700 text-lg bg-emerald-100 px-3 py-1 rounded-md mt-1 inline-block">{String(verificationResult.suggestedValue)}</p>
                            </div>
                             <div>
                                <p className="text-xs text-slate-500 font-semibold">Reasoning</p>
                                <p className="text-sm text-slate-700 italic mt-1">"{verificationResult.reasoning}"</p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-3">
                            <Button variant="outline" onClick={close}>Ignore</Button>
                            <Button variant="primary" onClick={applyVerification}>Apply Suggestion</Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {renderVerificationModal()}
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Baseline Assessment</h1>
            <div className="flex items-center space-x-2 text-slate-500 mt-1">
                <MapPin size={14} />
                <span>{data.address}</span>
            </div>
        </div>
        
        <div className="flex items-center space-x-2">
            {STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                return (
                    <div key={step.id} className="flex items-center">
                        <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                            ${isActive ? 'bg-emerald-600 text-white' : isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}
                        `}>
                            {isCompleted ? <CheckCircle size={16} /> : step.id + 1}
                        </div>
                        {step.id !== STEPS.length - 1 && (
                            <div className={`w-8 h-0.5 mx-1 ${isCompleted ? 'bg-emerald-200' : 'bg-slate-100'}`} />
                        )}
                    </div>
                );
            })}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 min-h-[400px] flex flex-col relative overflow-visible">
         <div className="mb-6 pb-4 border-b border-slate-100">
             <h2 className="text-xl font-bold text-slate-900">{STEPS[currentStep].title}</h2>
             <p className="text-slate-500 text-sm">{STEPS[currentStep].desc}</p>
         </div>

         <div className="flex-1 space-y-6">
            {currentStep === 0 && (
                 <div className="space-y-8 animate-fadeIn">
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-3 flex items-center"><User size={16} className="mr-2 text-slate-400"/> What is your role?</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {PERSONA_OPTIONS.map(p => (
                                <button key={p} onClick={() => handleChange('persona', p)} className={`p-4 rounded-lg border-2 text-left transition-colors ${data.persona === p ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <h4 className="font-bold text-slate-800">{p}</h4>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {p === 'Owner / Manager' ? 'Focus: ROI, OpEx, Tenants' : 
                                         p === 'Engineer / Architect' ? 'Focus: Modeling, Specs' : 
                                         'Focus: Installation, Emergency'}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 mb-3 flex items-center"><Target size={16} className="mr-2 text-slate-400"/> What is your top priority?</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {PRIORITY_OPTIONS.map(p => (
                                <button key={p} onClick={() => handleChange('priority', p)} className={`p-4 rounded-lg border-2 text-left transition-colors ${data.priority === p ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <h4 className="font-bold text-slate-800">{p}</h4>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Capital Budget Restraint ($)</label>
                            <input 
                                type="number" 
                                className="w-full p-3 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all" 
                                placeholder="e.g. 500000" 
                                value={data.capitalBudget || ''} 
                                onChange={e => handleChange('capitalBudget', Number(e.target.value))} 
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Leave blank if unknown. Used to generate budget-optimized pathways.</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Primary Process Load</label>
                            <select 
                                className="w-full p-3 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all" 
                                value={data.processLoadType || ''} 
                                onChange={e => handleChange('processLoadType', e.target.value)}
                            >
                                <option value="">Standard (Office/Retail)</option>
                                <option value="Commercial Kitchen">Commercial Kitchen (High Gas/Elec)</option>
                                <option value="Data Center">Data Center / IT (High Elec Base)</option>
                                <option value="Manufacturing">Light Manufacturing (High Motor Load)</option>
                                <option value="Refrigeration">Cold Storage / Refrigeration</option>
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1">Adjusts the energy profile to account for specific business activities.</p>
                        </div>
                    </div>
                </div>
            )}

            {currentStep === 1 && (
                <div className="animate-fadeIn">
                     <h3 className="font-semibold text-slate-900 mb-4 flex items-center"><FileText size={18} className="mr-2 text-slate-400"/> Digital Locker</h3>
                     <p className="text-sm text-slate-600 mb-6">Upload existing engineering reports or capital plans to automatically populate the baseline data.</p>
                     
                     <div 
                        onClick={handleCapitalPlanUpload}
                        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer ${data.capitalPlanUploaded ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-emerald-500 hover:bg-slate-100'}`}
                     >
                         {isUploadingPlan ? (
                             <div className="text-center">
                                 <Loader className="animate-spin text-emerald-500 mx-auto mb-3" size={32} />
                                 <p className="text-sm font-medium text-slate-600">Parsing Engineering Report...</p>
                             </div>
                         ) : data.capitalPlanUploaded ? (
                             <div className="text-center">
                                 <CheckCircle className="text-emerald-500 mx-auto mb-3" size={40} />
                                 <h4 className="font-bold text-emerald-900">Capital Plan Ingested</h4>
                                 <p className="text-xs text-emerald-700 mt-1">Auto-filled: Year Built, Heating System, Wall Type</p>
                             </div>
                         ) : (
                             <div className="text-center">
                                 <UploadCloud className="text-slate-400 mx-auto mb-3" size={40} />
                                 <h4 className="font-bold text-slate-700">Upload Assessment Report</h4>
                                 <p className="text-xs text-slate-500 mt-1">PDF, Excel, or CSV accepted</p>
                             </div>
                         )}
                     </div>
                </div>
            )}

            {currentStep === 2 && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                     {renderInput("Archetype", 'archetype', 'text', 'archetype')}
                     {renderInput("Province / Territory", 'province', 'text', 'province')}
                     {renderInput("Year Built", 'yearBuilt', 'number')}
                     {renderInput("Gross Floor Area (sq. ft)", 'areaSqFt', 'number')}
                     {renderInput("Stories", 'stories', 'number')}
                     {renderInput("Window/Wall %", 'windowWallRatio', 'number')}
                 </div>
            )}

            {currentStep === 3 && (
                 <div className="space-y-6 animate-fadeIn">
                     {renderInput("Wall Type", 'wallType', 'text', 'wallType')}
                     {renderInput("Roof Type", 'roofType', 'text', 'roofType')}
                     {renderInput("Window Type", 'windowType', 'text', 'windowType')}
                 </div>
            )}

            {currentStep === 4 && (
                 <div className="space-y-6 animate-fadeIn">
                     {renderInput("Heating System", 'heatingSystem', 'text', 'heatingSystem')}
                     {renderInput("Cooling System", 'coolingSystem', 'text', 'coolingSystem')}
                     {renderInput("Ventilation", 'ventilationSystem', 'text', 'ventilationSystem')}
                 </div>
            )}

            {currentStep === 5 && (
                <div className="animate-fadeIn">
                     <h3 className="font-semibold text-slate-900 mb-4">Energy Consumption Data</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Scout requires 12 months of utility data to calibrate the physics model.
                                If you don't have bills handy, we can generate a statistical baseline based on your archetype.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="block text-xs text-slate-500 uppercase">Electricity</span>
                                        {data.dataSources?.electricity && (
                                            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{data.dataSources.electricity}</span>
                                        )}
                                    </div>
                                    <span className="block font-mono font-medium text-slate-700">
                                        {data.utilityBillUploaded || data.elecUsage > 0 ? `${data.elecUsage.toLocaleString()} kWh` : '-- kWh'}
                                    </span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="block text-xs text-slate-500 uppercase">Natural Gas</span>
                                        {data.dataSources?.gas && (
                                            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{data.dataSources.gas}</span>
                                        )}
                                    </div>
                                    <span className="block font-mono font-medium text-slate-700">
                                        {data.utilityBillUploaded || data.gasUsage > 0 ? `${data.gasUsage.toLocaleString()} m³` : '-- m³'}
                                    </span>
                                 </div>
                            </div>
                        </div>
                        <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-colors h-40 ${data.utilityBillUploaded || data.monthlyData ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                            {data.utilityBillUploaded || data.monthlyData ? (
                                <div className="text-center">
                                    <CheckCircle className="text-emerald-500 mx-auto mb-2" size={32} />
                                    <p className="text-sm font-medium text-emerald-800">Data Sourced</p>
                                    <p className="text-xs text-emerald-600 mt-1">EUI: {data.energyConsumption || Math.round((data.elecUsage + data.gasUsage * 10.32) / data.areaSqFt)} ekWh/sqft</p>
                                </div>
                            ) : (
                                <div className="text-center w-full">
                                    <Button size="sm" variant="outline" onClick={handleSimulateUpload} className="w-full">
                                        <Sparkles size={14} className="mr-2 text-emerald-500"/>
                                        Generate Deterministic Data
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {data.monthlyData && (
                        <div className="mt-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-fadeIn">
                            <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center">
                                <BarChart3 size={16} className="mr-2 text-slate-400"/> Monthly Energy Profile {data.dataSources?.electricity?.includes('Synthetic') ? '(Modeled)' : ''}
                            </h4>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.monthlyData} margin={{top: 10, right: 10, left: 0, bottom: 0}}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                        <XAxis dataKey="month" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                        <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" tick={{fontSize: 10, fill: '#3b82f6'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${Math.round(val/1000)}k`} />
                                        <YAxis yAxisId="right" orientation="right" stroke="#f97316" tick={{fontSize: 10, fill: '#f97316'}} axisLine={false} tickLine={false} tickFormatter={(val) => `${Math.round(val/1000)}k`} />
                                        <Tooltip 
                                            formatter={(val: number, name: string) => [val.toLocaleString(), name === 'elec' ? 'Electricity (kWh)' : 'Gas (m³)']}
                                            contentStyle={{fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                        />
                                        <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                                        <Bar yAxisId="left" dataKey="elec" name="Electricity" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                                        <Bar yAxisId="right" dataKey="gas" name="Natural Gas" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            )}
         </div>

         <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between">
             <Button variant="ghost" onClick={handleBack} disabled={currentStep === 0}>
                 <ChevronLeft className="mr-2" size={16} /> Back
             </Button>
             <Button variant="primary" onClick={handleNext}>
                 {currentStep === 5 ? "View Pathways" : "Next Step"} <ChevronRight className="ml-2" size={16} />
             </Button>
         </div>
      </div>
    </div>
  );
};
