
import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, Maximize, Minimize, MessageSquare, AlertTriangle, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, BuildingData, SimulationContext, TabView, Source } from '../types';
import { createScoutChat, sendMessageToScout } from '../services/geminiService';

interface ChatAssistantProps {
  initialContext?: string;
  buildingData: BuildingData;
  activeTab: TabView;
  simulationContext?: SimulationContext;
  onVerifyRequest?: (field: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ 
    initialContext, 
    buildingData, 
    activeTab, 
    simulationContext,
    isExpanded,
    onToggleExpand,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [alerts, setAlerts] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeChatTab, setActiveChatTab] = useState<'chat' | 'alerts'>('chat');
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(false);

  const chatRef = useRef<any>(null); 
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextProcessedRef = useRef<string | null>(null);

  // Proactive alert refs to prevent spamming
  const paybackAlertSentRef = useRef(false);
  const euiAlertSentRef = useRef(false);
  const capexAlertSentRef = useRef(false);

  useEffect(() => {
    try {
      chatRef.current = createScoutChat(buildingData.persona);
      if (!initialContext) {
        addBotMessage("Hi, I'm Scout. I'm ready to analyze your portfolio. Enter an address to begin.");
      }
    } catch (e) {
      console.error("Failed to init chat", e);
    }
  }, [buildingData.persona]);

  useEffect(() => {
    if (initialContext && initialContext !== contextProcessedRef.current) {
        if (messages.length === 1 && messages[0].text.startsWith("Hi, I'm Scout")) {
             setMessages([]); 
        }
        addBotMessage(initialContext);
        contextProcessedRef.current = initialContext;
    }
  }, [initialContext]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, alerts]);
  
  // Proactive Triggers
  useEffect(() => {
      // Payback Alert
      if (simulationContext && simulationContext.paybackYears > 15 && !paybackAlertSentRef.current) {
          addAlertMessage("The payback period is high. I recommend toggling the 'Green Infrastructure Loan' in the Financing tab to extend the amortization term.");
          paybackAlertSentRef.current = true;
      }
      if (simulationContext && simulationContext.paybackYears <= 15) { paybackAlertSentRef.current = false; }
      
      // High EUI Alert
      if (buildingData.energyConsumption > 250 && !euiAlertSentRef.current) {
          addAlertMessage(`High Energy Use Intensity (${buildingData.energyConsumption} kWh/m²) detected. This indicates significant potential for savings.`);
          euiAlertSentRef.current = true;
      }

      // High CapEx Alert
      if (simulationContext && simulationContext.totalCapEx > 1000000 && !capexAlertSentRef.current) {
          addAlertMessage(`Project CapEx is significant (${(simulationContext.totalCapEx / 1000000).toFixed(1)}M). Let's review the Financing tab to model the capital stack and cashflow.`);
          capexAlertSentRef.current = true;
      }
      if (simulationContext && simulationContext.totalCapEx <= 1000000) { capexAlertSentRef.current = false; }

  }, [simulationContext, buildingData.energyConsumption]);

  const addBotMessage = (text: string, sources?: Source[]) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'model',
      text,
      timestamp: new Date(),
      sources
    }]);
  };

  const addAlertMessage = (text: string) => {
      setAlerts(prev => [...prev, {
          id: Date.now().toString(),
          role: 'model',
          text,
          timestamp: new Date(),
      }]);
      if (activeChatTab !== 'alerts') {
          setHasUnreadAlerts(true);
      }
  }

  const handleTabChange = (tab: 'chat' | 'alerts') => {
      setActiveChatTab(tab);
      if (tab === 'alerts') {
          setHasUnreadAlerts(false);
      }
  }

  const getContextString = () => {
      let ctx = `Current View: ${activeTab}. \n`;
      ctx += `Building: ${buildingData.address} (${buildingData.archetype}, Built ${buildingData.yearBuilt}). \n`;
      
      if (activeTab === TabView.BASELINE) {
          ctx += `Baseline Data: ${JSON.stringify(buildingData)}. \n`;
      }
      
      if (activeTab === TabView.SIMULATION && simulationContext) {
          ctx += `Simulation Results: CapEx $${simulationContext.totalCapEx}, Savings $${simulationContext.annualSavings}/yr, Payback ${simulationContext.paybackYears.toFixed(1)} yrs. \n`;
          ctx += `Selected Measures: ${simulationContext.selectedMeasures.join(', ')}. \n`;
      }
      
      return ctx;
  };

  const triggerUserMessage = async (text: string) => {
      if (!chatRef.current) return;
      
      const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          text: text,
          timestamp: new Date()
      };
      setMessages(prev => [...prev, userMsg]);
      setIsTyping(true);
      
      try {
          const context = getContextString();
          const { text: responseText, sources } = await sendMessageToScout(chatRef.current, userMsg.text, context);
          setIsTyping(false);
          addBotMessage(responseText, sources);
      } catch (error) {
          setIsTyping(false);
          addBotMessage("Connection error.");
      }
  };

  const handleSend = () => {
      if (!input.trim()) return;
      triggerUserMessage(input);
      setInput('');
  };

  const renderMessageList = (list: ChatMessage[]) => {
      return list.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`
              max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm
              ${msg.role === 'user' 
                ? 'bg-slate-800 text-white rounded-br-none' 
                : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}
            `}>
               {msg.role === 'model' && (
                 <div className="flex items-center space-x-1 mb-1 opacity-50">
                   {activeChatTab === 'chat' ? <Sparkles size={10} className="text-emerald-500" /> : <AlertTriangle size={10} className="text-amber-500"/> }
                   <span className={`text-[10px] uppercase font-bold ${activeChatTab === 'chat' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {activeChatTab === 'chat' ? 'AI Insight' : 'Scout Alert'}
                   </span>
                 </div>
               )}
              <div className="markdown-body leading-relaxed">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
              
              {/* Sources Rendering */}
              {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sources</p>
                      <div className="flex flex-wrap gap-2">
                          {msg.sources.slice(0, 3).map((src, idx) => (
                              <a 
                                key={idx} 
                                href={src.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="flex items-center text-[10px] bg-slate-50 text-emerald-600 px-2 py-1 rounded border border-slate-200 hover:bg-emerald-50 transition-colors"
                              >
                                  <ExternalLink size={8} className="mr-1"/>
                                  <span className="truncate max-w-[100px]">{src.title}</span>
                              </a>
                          ))}
                      </div>
                  </div>
              )}

              <span className={`text-[10px] mt-1 block ${msg.role === 'user' ? 'text-slate-400' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
      ));
  }

  return (
    <div className={`flex flex-col h-full bg-white border-l border-slate-200 shadow-xl z-20 transition-all duration-300 ${isExpanded ? 'w-full' : 'w-96'}`}>
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
            <Bot size={18} className="text-emerald-700" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Scout Assistant</h3>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs text-slate-500">Online & Context Aware</span>
            </div>
          </div>
        </div>
        <button onClick={onToggleExpand} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors">
            {isExpanded ? <Minimize size={16}/> : <Maximize size={16}/>}
        </button>
      </div>
      
      {/* Tabs */}
      <div className="px-4 pt-3 bg-slate-50 border-b border-slate-200">
          <div className="flex -mb-px">
              <button onClick={() => handleTabChange('chat')} className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 ${activeChatTab === 'chat' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <MessageSquare size={14}/> Chat
              </button>
               <button onClick={() => handleTabChange('alerts')} className={`relative flex items-center gap-2 px-4 py-2 text-sm font-semibold border-b-2 ${activeChatTab === 'alerts' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  <AlertTriangle size={14}/> Alerts
                  {hasUnreadAlerts && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
              </button>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scout-scroll bg-slate-50/50">
        {activeChatTab === 'chat' && renderMessageList(messages)}
        {activeChatTab === 'alerts' && (alerts.length > 0 ? renderMessageList(alerts) : (
            <div className="text-center py-10 text-slate-400 text-sm">
                <AlertTriangle className="mx-auto mb-2" size={32}/>
                No alerts yet. Scout will notify you of important findings here.
            </div>
        ))}
        {isTyping && activeChatTab === 'chat' && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {activeChatTab === 'chat' && (
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="relative">
            <input
              type="text"
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow bg-slate-50 focus:bg-white"
              placeholder="Ask Scout about this property..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim()}
              className="absolute right-2 top-2 p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
