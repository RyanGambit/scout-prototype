
import React, { useMemo } from 'react';
import { MaturityLevel, TabView, Persona, BuildingData } from '../types';
import { LayoutDashboard, LineChart, FileText, Building2, ArrowLeft, Wallet, ClipboardCheck, GitCompare, FileSearch, Split } from 'lucide-react';

interface SidebarProps {
  currentLevel: MaturityLevel;
  activeTab: TabView;
  onTabChange: (tab: TabView) => void;
  onBackToPortfolio?: () => void;
  persona?: Persona;
  data: BuildingData;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentLevel, activeTab, onTabChange, onBackToPortfolio, persona, data }) => {
  
  // Calculate Data Confidence Score
  const confidenceScore = useMemo(() => {
      let score = 10; // Base: Pure Archetype Assumptions
      if (data.yearBuilt > 0 && data.areaSqFt > 0) score += 10;
      if (data.utilityBillUploaded) score += 25;
      if (data.capitalPlanUploaded) score += 25;
      if (!data.isEstimate) score += 20;
      return Math.min(100, score);
  }, [data]);

  const getConfidenceColor = (score: number) => {
      if (score < 40) return 'bg-red-500';
      if (score < 70) return 'bg-amber-500';
      return 'bg-emerald-500';
  };

  // Define tabs based on Persona
  const getTabs = () => {
    const commonStart = [
        { id: TabView.BASELINE, label: '1. Baseline', icon: LayoutDashboard },
        { id: TabView.PATHWAYS, label: '2. Pathways', icon: Split }
    ];
    
    // Default: Owner / Manager Flow
    // New Logic: Actions (Strategy) comes BEFORE deep Simulation/Finance
    return [
        ...commonStart,
        { id: TabView.ACTIONS, label: '3. Action Plan', icon: ClipboardCheck },
        { id: TabView.SIMULATION, label: '4. Simulation', icon: LineChart },
        { id: TabView.FINANCING, label: '5. Financing', icon: Wallet },
        { id: TabView.REPORTS, label: 'Reports', icon: FileText },
    ];
  };

  const tabs = getTabs();

  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-6 flex items-center space-x-2 border-b border-slate-800">
        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
          <Building2 className="text-white w-5 h-5" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">SCOUT</span>
      </div>

      {/* Data Confidence Meter */}
      <div className="px-6 py-4 border-b border-slate-800 relative group cursor-help">
          <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Data Confidence</span>
              <span className={`text-xs font-bold ${confidenceScore < 60 ? 'text-amber-400' : 'text-emerald-400'}`}>{confidenceScore}%</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-700 ${getConfidenceColor(confidenceScore)}`} 
                style={{width: `${confidenceScore}%`}}
              ></div>
          </div>
          
          {/* Tooltip */}
          {confidenceScore < 60 && (
              <div className="absolute top-full left-4 right-4 mt-2 p-2 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                  High reliance on assumptions. Upload utility bills or engineering reports to improve accuracy.
              </div>
          )}
      </div>

      {onBackToPortfolio && (
          <div className="px-3 pt-4">
            <button 
                onClick={onBackToPortfolio}
                className="w-full flex items-center space-x-2 text-xs text-slate-400 hover:text-white transition-colors px-3 py-2 rounded hover:bg-slate-800"
            >
                <ArrowLeft size={14} />
                <span>All Properties</span>
            </button>
          </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            {persona || 'Workspace'}
        </p>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-slate-800 text-emerald-400' 
                  : 'hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
