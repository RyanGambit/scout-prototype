import React, { useState, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatAssistant } from './components/ChatAssistant';
import { BaselineView } from './components/BaselineView';
import { SimulationView } from './components/SimulationView';
import { FinancingView } from './components/FinancingView';
import { ReportsView } from './components/ReportsView';
import { ActionsView } from './components/ActionsView';
import { CompareView } from './components/CompareView';
import { DocsView } from './components/DocsView';
import { PathwaysView } from './components/PathwaysView';
import { Button } from './components/Button';
import { BuildingData, MaturityLevel, TabView, SimulationContext, Scenario, RetrofitMeasure, ActionPlan } from './types';
import { Search, MapPin, ArrowRight, Building, Plus, PlayCircle } from 'lucide-react';
import { generateBuildingInsights } from './services/geminiService';
import { KING_STREET_BUILDING, KING_STREET_MEASURES, KING_STREET_SIMULATION } from './data/demoBuilding';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'portfolio' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState<TabView>(TabView.BASELINE);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  
  const [properties, setProperties] = useState<BuildingData[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [maturityLevels, setMaturityLevels] = useState<Record<string, MaturityLevel>>({});
  
  const [simulationContexts, setSimulationContexts] = useState<Record<string, SimulationContext>>({});
  const [activeScenarios, setActiveScenarios] = useState<Record<string, Scenario>>({});
  const [measuresCatalog, setMeasuresCatalog] = useState<Record<string, RetrofitMeasure[]>>({});
  
  const [searchAddress, setSearchAddress] = useState('');
  const [initialAiInsight, setInitialAiInsight] = useState<string>("");

  const activeProperty = properties.find(p => p.id === selectedPropertyId);
  const activeMaturity = selectedPropertyId ? (maturityLevels[selectedPropertyId] || MaturityLevel.LEVEL_0) : MaturityLevel.LEVEL_0;
  const activeSimulationCtx = selectedPropertyId ? simulationContexts[selectedPropertyId] : undefined;
  const activeScenario = selectedPropertyId ? activeScenarios[selectedPropertyId] : undefined;
  
  const activeMeasuresCatalog = (selectedPropertyId && measuresCatalog[selectedPropertyId]) ? measuresCatalog[selectedPropertyId] : [];

  const handleLoadDemo = () => {
      setIsLoading(true);
      setTimeout(() => {
          const demoId = KING_STREET_BUILDING.id;
          
          setProperties(prev => [...prev, KING_STREET_BUILDING]);
          setMaturityLevels(prev => ({...prev, [demoId]: MaturityLevel.LEVEL_3})); // Jump to Level 3
          setMeasuresCatalog(prev => ({...prev, [demoId]: KING_STREET_MEASURES}));
          setSimulationContexts(prev => ({...prev, [demoId]: KING_STREET_SIMULATION}));
          
          // Setup demo scenario
          const demoScenario: Scenario = {
              id: 'demo-scenario',
              name: "Deep Retrofit (Verified)",
              measures: KING_STREET_MEASURES,
              preset: 'deep',
              carbonPrice: 170, // 2030 target
              inflationRate: 2,
              discountRate: 7.5
          };
          setActiveScenarios(prev => ({ ...prev, [demoId]: demoScenario }));
          
          setSelectedPropertyId(demoId);
          setView('dashboard');
          setActiveTab(TabView.FINANCING); // Jump to Financing
          setInitialAiInsight("I've loaded the verified case study for 55 King St E. This is a 1982 office building targeting a 55% GHG reduction via heat pump fuel switching. The financial model includes the new CIB amortizing debt structure and corrected CT ITC basis.");
          setIsLoading(false);
      }, 800);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAddress) return;

    setIsLoading(true);

    try {
        const result = await generateBuildingInsights(searchAddress);
        setInitialAiInsight(result.insight);
        
        const newProperty: BuildingData = {
            id: Date.now().toString(),
            address: searchAddress,
            province: 'ON',
            yearBuilt: 0,
            archetype: 'Unknown',
            areaSqFt: 0,
            stories: 0,
            occupancyType: 'Commercial',
            wallType: 'Unknown',
            roofType: 'Unknown',
            windowType: 'Unknown',
            windowWallRatio: 0,
            heatingSystem: 'Unknown',
            coolingSystem: 'Unknown',
            ventilationSystem: 'Unknown',
            energyConsumption: 0,
            elecUsage: 0,
            gasUsage: 0,
            utilityBillUploaded: false,
            capitalPlanUploaded: false,
            isEstimate: false,
            persona: 'Owner / Manager',
            priority: 'Reduce Bills',
            savedScenarios: [],
            actionPlan: undefined,
            ...result.buildingData
        };
        const propertyId = newProperty.id;

        setProperties(prev => [...prev, newProperty]);
        setMaturityLevels(prev => ({...prev, [propertyId]: MaturityLevel.LEVEL_1}));
        setMeasuresCatalog(prev => ({...prev, [propertyId]: result.suggestedMeasures}));
        
        const initialScenario: Scenario = {
            id: 'init',
            name: "Current Baseline",
            measures: result.suggestedMeasures.map(m => ({ ...m, selected: false })),
            preset: 'baseline',
            carbonPrice: 95, // 2025 rate
            inflationRate: 3,
            discountRate: 5
        };
        setActiveScenarios(prev => ({ ...prev, [propertyId]: initialScenario }));
        
        setSelectedPropertyId(propertyId);
        setView('dashboard');
        setSearchAddress('');
        setIsLoading(false);

    } catch (err) {
        console.error("Search failed", err);
        setIsLoading(false);
    }
  };

  const updateActiveProperty = useCallback((newData: React.SetStateAction<BuildingData>) => {
      if (!selectedPropertyId) return;
      setProperties(prev => prev.map(p => {
          if (p.id === selectedPropertyId) {
             return typeof newData === 'function' ? newData(p) : newData;
          }
          return p;
      }));
  }, [selectedPropertyId]);

  const handleUpdatePlan = useCallback((plan: ActionPlan) => {
      if (selectedPropertyId) {
          setProperties(prev => prev.map(p => {
              if (p.id === selectedPropertyId) {
                  return { ...p, actionPlan: plan };
              }
              return p;
          }));
      }
  }, [selectedPropertyId]);

  const setMaturityLevel = useCallback((level: MaturityLevel) => {
      if (selectedPropertyId) {
          setMaturityLevels(prev => ({...prev, [selectedPropertyId]: level}));
      }
  }, [selectedPropertyId]);

  const handleSimulationUpdate = useCallback((ctx: SimulationContext) => {
      if (selectedPropertyId) {
          setSimulationContexts(prev => ({...prev, [selectedPropertyId]: ctx}));
      }
  }, [selectedPropertyId]);

  const handleScenarioChange = useCallback((updatedScenario: Scenario) => {
      if (selectedPropertyId) {
          setActiveScenarios(prev => ({ ...prev, [selectedPropertyId]: updatedScenario }));
      }
  }, [selectedPropertyId]);

  const handleSaveScenario = useCallback((scenario: Scenario) => {
      if (selectedPropertyId) {
          setProperties(prev => prev.map(p => {
              if (p.id === selectedPropertyId) {
                  return {
                      ...p,
                      savedScenarios: [...(p.savedScenarios || []), scenario]
                  };
              }
              return p;
          }));
      }
  }, [selectedPropertyId]);

  const handleStrategySelect = useCallback((scenario: Scenario) => {
      if (selectedPropertyId) {
          setActiveScenarios(prev => ({ ...prev, [selectedPropertyId]: scenario }));
          setActiveTab(TabView.ACTIONS);
          setMaturityLevels(prev => ({...prev, [selectedPropertyId]: MaturityLevel.LEVEL_3}));
      }
  }, [selectedPropertyId]);

  if (view === 'landing' && properties.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
             <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-emerald-50 rounded-full blur-3xl opacity-50"></div>
             <div className="absolute bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-3xl opacity-50"></div>
        </div>
        <div className="max-w-2xl w-full px-6 relative z-10 text-center">
            <div className="inline-flex items-center space-x-2 bg-slate-100 px-3 py-1 rounded-full text-slate-600 mb-8 border border-slate-200">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-semibold tracking-wide uppercase">AI Scout Engine Online</span>
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-slate-900 mb-6">
                Deep Energy Retrofits, <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Underwritten by AI.</span>
            </h1>
            <form onSubmit={handleSearch} className="relative max-w-lg mx-auto transform transition-all hover:scale-[1.01] mb-8">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <MapPin className="text-slate-400" />
                </div>
                <input 
                    type="text" 
                    placeholder="Enter building address..." 
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-200 shadow-xl shadow-slate-200/50 text-lg outline-none focus:border-emerald-500 transition-colors"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                />
                <Button 
                    className="absolute right-2 top-2 bottom-2 aspect-square !p-0 rounded-lg bg-slate-900 hover:bg-slate-800"
                    isLoading={isLoading}
                    disabled={!searchAddress}
                >
                    {!isLoading && <ArrowRight className="text-white" />}
                </Button>
            </form>

            {isLoading && (
                <div className="mt-6 text-slate-400 text-sm animate-pulse flex flex-col items-center">
                    <p>Scouting public records & generating initial scope...</p>
                </div>
            )}
        </div>
      </div>
    );
  }

  if (view === 'portfolio') {
      return (
          <div className="min-h-screen bg-slate-50 p-8">
              <div className="max-w-5xl mx-auto">
                  <div className="flex justify-between items-center mb-8">
                      <h1 className="text-2xl font-bold text-slate-900">Portfolio</h1>
                      <div className="relative">
                           <form onSubmit={handleSearch} className="flex gap-2">
                                <input 
                                    type="text" 
                                    placeholder="Add new property..." 
                                    className="px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none w-64"
                                    value={searchAddress}
                                    onChange={(e) => setSearchAddress(e.target.value)}
                                />
                                <Button isLoading={isLoading} disabled={!searchAddress}>
                                    <Plus size={16} className="mr-2"/> Add
                                </Button>
                           </form>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {properties.map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => { setSelectedPropertyId(p.id); setView('dashboard'); }}
                            className="bg-white p-6 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer group"
                          >
                              <div className="flex items-start justify-between mb-4">
                                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                      <Building size={20} />
                                  </div>
                                  <span className="text-xs font-semibold bg-slate-100 px-2 py-1 rounded text-slate-500">
                                      Level {maturityLevels[p.id]}/4
                                  </span>
                              </div>
                              <h3 className="font-bold text-lg text-slate-900 truncate">{p.address}</h3>
                              <p className="text-sm text-slate-500 mb-4">{p.archetype} • {p.areaSqFt.toLocaleString()} sq.ft</p>
                              <div className="flex items-center text-xs text-emerald-600 font-medium">
                                  View Dashboard <ArrowRight size={12} className="ml-1" />
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )
  }

  if (!activeProperty) return null;

  return (
    <div className="flex h-screen bg-slate-50">
        <Sidebar 
            currentLevel={activeMaturity} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            onBackToPortfolio={() => setView('portfolio')}
            persona={activeProperty.persona}
            data={activeProperty}
        />
        <div className="flex-1 flex min-w-0 overflow-hidden">
             <main className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${isChatExpanded ? 'hidden' : 'flex'}`}>
                <header className="bg-white border-b border-slate-200 h-20 flex items-center justify-between px-8 flex-shrink-0">
                    <div>
                        <div className="flex items-center space-x-2 text-slate-700 font-medium">
                            <Building size={18} />
                            <span>{activeProperty.address}</span>
                        </div>
                        <p className="text-slate-500 text-sm mt-1">{activeProperty.archetype} • <span className="text-emerald-600 font-semibold">{activeProperty.persona}</span> View</p>
                    </div>
                </header>
                <div className="flex-1 overflow-auto p-8">
                    {activeTab === TabView.BASELINE && (
                        <BaselineView 
                            key={activeProperty.id}
                            data={activeProperty} 
                            setData={updateActiveProperty} 
                            level={activeMaturity} 
                            setLevel={setMaturityLevel}
                            onTabChange={setActiveTab}
                        />
                    )}
                    {activeTab === TabView.PATHWAYS && (
                        <PathwaysView 
                            key={activeProperty.id}
                            data={activeProperty}
                            onSelectStrategy={handleStrategySelect}
                            measuresCatalog={activeMeasuresCatalog}
                        />
                    )}
                    <div style={{ display: activeTab === TabView.SIMULATION ? 'block' : 'none' }}>
                        <SimulationView 
                            key={activeProperty.id}
                            data={activeProperty}
                            measuresCatalog={activeMeasuresCatalog}
                            activeScenario={activeScenario}
                            onScenarioChange={handleScenarioChange}
                            onUpdate={handleSimulationUpdate}
                            currentMaturity={activeMaturity}
                            onMaturityUpdate={setMaturityLevel}
                            onSaveScenario={handleSaveScenario}
                        />
                    </div>
                     {activeTab === TabView.FINANCING && (
                        <FinancingView 
                            key={activeProperty.id}
                            level={activeMaturity} 
                            data={activeProperty} 
                            simulationContext={activeSimulationCtx}
                        />
                    )}
                    {activeTab === TabView.ACTIONS && (
                        <ActionsView 
                            key={activeProperty.id}
                            level={activeMaturity}
                            data={activeProperty}
                            simulationContext={activeSimulationCtx}
                            activeScenario={activeScenario}
                            onUpdatePlan={handleUpdatePlan}
                            onNavigate={setActiveTab}
                        />
                    )}
                    {activeTab === TabView.REPORTS && (
                        <ReportsView 
                            key={activeProperty.id}
                            level={activeMaturity} 
                            data={activeProperty}
                            simulationContext={activeSimulationCtx}
                        />
                    )}
                    {activeTab === TabView.COMPARE && (
                        <CompareView data={activeProperty} />
                    )}
                    {activeTab === TabView.DOCS && (
                        <DocsView />
                    )}
                </div>
            </main>
            <ChatAssistant 
                key={activeProperty.id}
                initialContext={initialAiInsight} 
                buildingData={activeProperty}
                activeTab={activeTab}
                simulationContext={activeSimulationCtx}
                isExpanded={isChatExpanded}
                onToggleExpand={() => setIsChatExpanded(prev => !prev)}
            />
        </div>
    </div>
  );
};

export default App;
