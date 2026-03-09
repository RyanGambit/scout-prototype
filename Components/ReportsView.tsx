
import React, { useState, useMemo } from 'react';
import { BuildingData, MaturityLevel, SimulationContext, Source } from '../types';
import { FileText, Lock, Download, CheckCircle, ChevronRight, ChevronLeft, Printer, AlertTriangle, Building, Zap, CloudRain, Sparkles, HelpCircle, ExternalLink, Globe } from 'lucide-react';
import { Button } from './Button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateReport } from '../services/geminiService';

interface ReportsViewProps {
  level: MaturityLevel;
  data: BuildingData;
  simulationContext?: SimulationContext;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ level, data, simulationContext }) => {
  const [userPrompt, setUserPrompt] = useState('');
  const [generatedReport, setGeneratedReport] = useState('');
  const [reportSources, setReportSources] = useState<Source[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // State for the "Complex Query" simulation
  const [showMissingInfo, setShowMissingInfo] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const isLocked = level < MaturityLevel.LEVEL_3;

  const handleGenerateReport = async () => {
    // Demo Logic: If prompt is short, generate immediately.
    // If prompt is long (complex), trigger the "Missing Info" simulation.
    if (userPrompt.length > 30 && !showMissingInfo && !generatedReport) {
        setShowMissingInfo(true);
        return;
    }

    setIsGenerating(true);
    setGeneratedReport('');
    setReportSources([]);
    
    try {
      const { text, sources } = await generateReport(userPrompt, data, simulationContext);
      setGeneratedReport(text);
      setReportSources(sources);
    } catch (e) {
      setGeneratedReport('An error occurred while generating the report.');
    } finally {
      setIsGenerating(false);
      setShowMissingInfo(false);
    }
  };

  const handleSynthesize = () => {
      setIsSynthesizing(true);
      setTimeout(() => {
          setIsSynthesizing(false);
          handleGenerateReport(); // Proceed to generate
      }, 2000);
  };

  if (isLocked) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-6">
          <Lock className="text-slate-400" size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Dynamic Reports Locked</h2>
        <p className="text-slate-500 max-w-md mb-6">
          You need to reach <strong>Maturity Level 3</strong> (Business Case) to generate custom reports. Please complete the Simulation tab first.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <header>
          <h1 className="text-2xl font-bold text-slate-900">AI Report Generator</h1>
          <p className="text-slate-500 text-sm mt-1">Describe the report you need, and Scout will generate it based on your project data.</p>
      </header>

      {/* Main Input Area */}
      {!showMissingInfo ? (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <label htmlFor="report-prompt" className="block text-sm font-medium text-slate-700">Report Prompt</label>
            <textarea
            id="report-prompt"
            rows={3}
            className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="e.g., 'Create a technical summary for an engineering team...' or 'Write a one-page memo for a tenant...'"/>
            <div className="flex justify-end">
            <Button onClick={handleGenerateReport} isLoading={isGenerating}>
                <Sparkles size={16} className="mr-2"/> Generate Report
            </Button>
            </div>
        </div>
      ) : (
          /* Missing Information Simulation State */
          <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                  <div className="bg-amber-100 p-2 rounded-lg">
                      <HelpCircle className="text-amber-600" size={24}/>
                  </div>
                  <div>
                      <h3 className="font-bold text-amber-900">Information Gap Detected</h3>
                      <p className="text-sm text-amber-800 mt-1">
                          To generate a report of this depth, I need specific details that aren't in the Baseline yet.
                      </p>
                  </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-amber-100 space-y-3">
                  <p className="text-xs font-bold text-slate-500 uppercase">Missing Data Points</p>
                  <ul className="text-sm text-slate-700 space-y-2">
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span> Detailed Occupancy Schedules (Weekends vs Weekdays)</li>
                      <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span> Existing HVAC Maintenance Logs</li>
                  </ul>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                   <Button variant="outline" size="sm" onClick={() => setShowMissingInfo(false)}>Cancel</Button>
                   <Button variant="primary" size="sm" onClick={handleSynthesize} isLoading={isSynthesizing}>
                       <Sparkles size={14} className="mr-2"/> Synthesize & Generate
                   </Button>
              </div>
              <p className="text-[10px] text-center text-amber-700/60">
                  Scout will use archetype assumptions to fill these gaps.
              </p>
          </div>
      )}

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm min-h-[400px]">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-3 mb-4">Generated Document</h2>
          {isGenerating && (
            <div className="flex flex-col items-center justify-center text-slate-400 py-20">
              <Sparkles size={32} className="animate-pulse mb-4"/>
              <p>Scout is writing your report...</p>
            </div>
          )}
          
          {generatedReport && (
            <>
                <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-slate-900 prose-a:text-emerald-600 mb-8">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedReport}</ReactMarkdown>
                </div>

                {/* Report Sources Section */}
                {reportSources.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center mb-4">
                            <Globe size={16} className="mr-2 text-blue-500"/> Sources & Citations
                        </h3>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {reportSources.map((src, idx) => (
                                <a 
                                    key={idx}
                                    href={src.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all group"
                                >
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">{src.title}</p>
                                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{src.url}</p>
                                    </div>
                                    <ExternalLink size={14} className="text-slate-300 group-hover:text-emerald-500 ml-2 flex-shrink-0" />
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </>
          )}

           {!isGenerating && !generatedReport && (
                <div className="text-center text-slate-400 py-20">
                    <FileText size={32} className="mx-auto mb-4"/>
                    <p>Your generated report will appear here.</p>
                </div>
            )}
      </div>
    </div>
  );
};
