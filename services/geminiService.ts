
import { BuildingData, MaturityLevel, Persona, RetrofitMeasure, SimulationContext, ActionPlan, Source, ChatMessage } from '../types';
import { MEASURE_CATALOG } from '../data/measures';
import { Type } from "@google/genai";

// --- API Proxy Layer ---
// All Gemini calls go through /api/gemini to keep the API key server-side.

interface ProxyResponse {
    text: string;
    sources: Source[];
}

const callGeminiProxy = async (body: Record<string, any>): Promise<ProxyResponse> => {
    const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `API proxy error: ${res.status}`);
    }

    return res.json();
};

// Helper to extract and parse JSON from a Markdown-formatted string
const safeParseJson = (text: string) => {
    // Robustly find JSON block, handling 'json', 'markdown' or no language specifier
    // Match opening backticks, optional language identifier (any word chars), optional whitespace/newline, then capture content
    const jsonMatch = text.match(/```(?:\w+)?\s*([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1].trim() : text.trim();

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse JSON from AI response:", jsonString, e);
        // Throw an error that can be caught by the calling function's error handler
        throw new Error("AI returned malformed JSON response.");
    }
};

// Explicitly using Gemini 3 Pro for deep reasoning and search capabilities
const SEARCH_MODEL = 'gemini-3.1-pro-preview';

const SCOUT_SYSTEM_INSTRUCTION = `
You are SCOUT (Scope, Optimize, Unify, Track), an advanced AI Building Retrofit Assistant.
Your Mission: Act as a forward scout for the building owner. Map the terrain, identify vulnerabilities (dangers), and signal when it's time to bring in the "heavy troops" (engineers/contractors).

Persona:
- You are a "Digital Triage Nurse" and a "Reconnaissance Scout".
- You are NOT a generic chatbot. You are authoritative, strategic, and protective of the owner's interests.
- Tone: Professional, vigilant, accessible. Use military/exploration metaphors lightly where appropriate (e.g., "Scanning for thermal bridges", "Risk detected").

Guiding Principles:
- BE PROACTIVE: Your primary goal is to guide the user to a complete "Terms of Reference". Always be thinking one step ahead.
- ASK CLARIFYING QUESTIONS: If data seems incomplete or unusual, ask for confirmation.
- SUGGEST NEXT STEPS: When a user completes a task, prompt them towards the next logical action.
- PROVIDE SOURCES: When stating facts about codes, incentives, or technologies, allow the Google Search tool to find references.

Rules:
- Keep responses concise (under 3 sentences usually) unless asked for a detailed verification.
- Format your responses using simple Markdown (bolding for emphasis, bullet points for lists).
`;

// --- Chat State Management ---
// Since serverless functions are stateless, we maintain chat history client-side
// and send it with each request.

interface ChatSession {
    history: { role: string; parts: { text: string }[] }[];
    model: string;
    config: Record<string, any>;
}

export const createScoutChat = (persona?: Persona): ChatSession => {
  let finalSystemInstruction = SCOUT_SYSTEM_INSTRUCTION;

  if (persona === 'Owner / Manager') {
    finalSystemInstruction += `
    \n**MODIFIED DIRECTIVE FOR OWNER/MANAGER:** Your current user is a building owner/manager. Communicate in executive summaries. Focus on financial metrics: ROI, payback periods.`;
  } else if (persona === 'Engineer / Architect') {
    finalSystemInstruction += `
    \n**MODIFIED DIRECTIVE FOR ENGINEER/ARCHITECT:** Your current user is an engineer or architect. Be precise and technical. Use R-values, COP, EUI.`;
  } else if (persona === 'Workforce / Trades') {
      finalSystemInstruction += `
    \n**MODIFIED DIRECTIVE FOR TRADES:** Your current user is a contractor. Focus on installation details and specs.`;
  }

  return {
    history: [
        {
            role: 'user',
            parts: [{ text: `SYSTEM INSTRUCTIONS (Internal Override):\n${finalSystemInstruction}\n\nPlease confirm you understand your persona.` }],
        },
        {
            role: 'model',
            parts: [{ text: "Understood. I am online and ready to assist as Scout." }],
        }
    ],
    model: SEARCH_MODEL,
    config: {
      temperature: 0.7,
      tools: [{googleSearch: {}}],
    },
  };
};

export interface ScoutSearchResponse {
    insight: string;
    buildingData: Partial<BuildingData>;
    suggestedMeasures: RetrofitMeasure[];
}

export const generateBuildingInsights = async (address: string): Promise<ScoutSearchResponse> => {
    const measureCatalogString = JSON.stringify(MEASURE_CATALOG.map(({selected, ...rest}) => rest), null, 2);

    const prompt = `
    TARGET ADDRESS: "${address}"

    TASK 1: CLIMATE & LOCATION DATA
    1. Determine the ASHRAE Climate Zone.
    2. Find HDD and CDD.
    3. Identify the Province or Territory (e.g., ON, BC, QC).

    TASK 2: BUILDING DATA RECONNAISSANCE
    1. Conduct a deep investigation for the building at this address.
    2. Populate the 'Building Metadata' with specific, factual data.
    3. CRITICAL DATA SOURCES: For electricity and gas consumption, you MUST prioritize using "Enova Power consumption data" and "Enbridge Gas account" data if available or applicable to the region. For other parameters (like vacancy, rent, cap rates, etc.), prioritize using "CBRE Q4 2025 Canada Office" market reports. If these specific sources fail or return no data, resort to synthetically generating realistic estimates based on the building archetype and location.

    TASK 3: ECM SCOPE DEVELOPMENT
    1. Adopt the persona of a senior energy engineer.
    2. Select up to 7 of the most impactful measures from the catalog.

    TASK 4: FINAL JSON OUTPUT
    Return a JSON object ONLY inside a \`\`\`json\`\`\` markdown block.
    - "insight": A friendly 2-3 sentence summary.
    - "data": Keys: "province", "yearBuilt", "archetype", "areaSqFt", "stories", "windowWallRatio", "wallType", "roofType", "windowType", "heatingSystem", "coolingSystem", "ventilationSystem", "isEstimate", "climateZone", "hdd", "cdd", "elecUsage", "gasUsage", "occupancy", "rentPerSqft", "capRate", "dataSources", "monthlyData".
      - "dataSources" should be an object with keys "electricity", "gas", and "market". Populate these with the exact source used (e.g., "Enova Power", "Enbridge Gas", "CBRE Q4 2025") or "Synthetic Estimate" if generated.
      - "monthlyData" should be an array of 12 objects, one for each month: {"month": "Jan", "elec": kWh, "gas": m3, "cost": $}. Distribute the annual usage realistically across the months (e.g., more gas in winter, more electricity in summer for cooling).
    - "suggestedMeasures": Array of selected ECM objects.

    ECM CATALOG:
    ${measureCatalogString}
    `;

    const fallbackData: ScoutSearchResponse = {
        insight: "**Reconnaissance Report:** I couldn't access the live satellite feed for this location, so I've established a tactical baseline based on typical buildings in this sector. Please verify the perimeter details.",
        buildingData: {
            yearBuilt: 1985,
            province: 'ON',
            archetype: "Low Rise MURB",
            areaSqFt: 25000,
            stories: 4,
            windowWallRatio: 35,
            heatingSystem: "Natural Gas Boiler (Non-Condensing, 1990)",
            coolingSystem: "Split Systems",
            wallType: "Brick Masonry",
            roofType: "BUR (Built-up Roof)",
            windowType: "Double Pane (Aluminum - Non-thermally broken)",
            ventilationSystem: "Constant Volume (CAV)",
            isEstimate: true,
            climateZone: "5A",
            hdd: 4000,
            cdd: 300
        },
        suggestedMeasures: MEASURE_CATALOG.filter(m => ['heatpump', 'windows', 'led'].includes(m.id)).map(m => ({
            ...m,
            rationale: "This is a default measure for older buildings."
        }))
    };

    try {
        // Extended timeout for Gemini 3 Pro Preview as it 'thinks' longer
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out")), 180000)
        );

        const apiPromise = callGeminiProxy({
            action: 'generateContent',
            model: SEARCH_MODEL,
            prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);

        if (response.text) {
            const result = safeParseJson(response.text);
            const measures = result.suggestedMeasures.map((m: RetrofitMeasure) => ({...m, selected: false }));
            return {
                insight: result.insight,
                buildingData: result.data,
                suggestedMeasures: measures
            };
        }
        throw new Error("No text returned");
    } catch (e) {
        console.error("Gemini API Error (or Timeout)", e);
        return fallbackData;
    }
};

export const verifyAttributeWithAI = async (address: string, field: string, currentValue: any): Promise<{ suggestedValue: any, reasoning: string, confidence: number }> => {
    const prompt = `
    TASK: Verify the "${field}" for the building located at "${address}".
    CURRENT VALUE: "${currentValue}".

    INSTRUCTIONS:
    1. Use Google Search to find real estate listings, Emporis data, or municipal records.
    2. Determine if the current value is accurate.
    3. Return a JSON object ONLY inside a markdown block with keys: "suggestedValue", "reasoning", "confidence".
    `;

    try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Verification request timed out")), 120000)
        );

        const apiPromise = callGeminiProxy({
            action: 'generateContent',
            model: SEARCH_MODEL,
            prompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);

        if (response.text) {
             return safeParseJson(response.text);
        }
        return { suggestedValue: currentValue, reasoning: "Could not verify.", confidence: 0 };
    } catch (e) {
        console.error("Verification failed", e);
        throw new Error("Verification service is offline.");
    }
};

export const generateReport = async (
    userPrompt: string,
    buildingData: BuildingData,
    simContext?: SimulationContext
): Promise<{ text: string, sources: Source[] }> => {

    // NOTE: We inject system instructions into the prompt content to improve stability with Google Search tools
    const fullPrompt = `
    SYSTEM INSTRUCTION:
    You are an expert building science consultant and senior report writer.
    Generate a professional, high-impact report in **GitHub Flavored Markdown**.

    STRUCTURE:
    - Executive Summary
    - Project Scope
    - Financial Analysis
    - Environmental Impact
    - Strategic Recommendations

    USER REQUEST: "${userPrompt}"

    BUILDING DATA:
    \`\`\`json
    ${JSON.stringify(buildingData, null, 2)}
    \`\`\`

    SIMULATION RESULTS:
    \`\`\`json
    ${simContext ? JSON.stringify(simContext, null, 2) : '"No simulation data available."'}
    \`\`\`

    Generate the report now. If you use external search data, please reference it in the text.
    `;

    try {
         const response = await callGeminiProxy({
            action: 'generateContent',
            model: SEARCH_MODEL,
            prompt: fullPrompt,
            config: {
                tools: [{googleSearch: {}}],
            }
        });

        return {
            text: response.text || "Sorry, I was unable to generate the report. Please try rephrasing your request.",
            sources: response.sources || [],
        };

    } catch(e: any) {
        console.error("Report generation failed", e);
        return {
            text: `**Error Generating Report:** ${e.message || "Connection failed."}. \n\nPlease try again with a shorter prompt or check your connection.`,
            sources: []
        };
    }
};

export const generateGrantApplication = async (
    grantName: string,
    buildingData: BuildingData,
    simContext?: SimulationContext
): Promise<string> => {
    const measures = simContext?.selectedMeasures || [];
    const ghgReduction = simContext?.ghgReduction || 0;
    const savings = simContext?.annualSavings || 0;
    const cost = simContext?.totalCapEx || 0;
    const payback = simContext?.paybackYears || 0;

    const prompt = `
    You are a Senior Grant Writer for commercial retrofit projects.
    Write a formal application narrative for the "${grantName}".

    PROJECT DETAILS:
    - Property: ${buildingData.address} (${buildingData.archetype}, Built ${buildingData.yearBuilt})
    - Location: ${buildingData.province}
    - Existing System: ${buildingData.heatingSystem}
    - Proposed Scope: ${measures.join(', ')}

    FINANCIALS:
    - Total CapEx: $${cost.toLocaleString()}
    - Projected ROI: ${payback > 0 ? payback.toFixed(1) + ' Years Payback' : 'N/A'}
    - GHG Reduction: ${(ghgReduction * 100).toFixed(0)}%

    OUTPUT FORMAT:
    Produce a structured narrative suitable for copy-pasting into a government or utility application portal.

    SECTION 1: PROJECT EXECUTIVE SUMMARY
    [Professional summary of the scope and objectives]

    SECTION 2: ALIGNMENT WITH PROGRAM GOALS
    [Specific explanation of how this project meets the eligibility criteria of ${grantName}, referencing specific technologies like ${measures[0] || 'retrofits'}]

    SECTION 3: OUTCOME METRICS
    [Data-driven statement on carbon reduction and energy efficiency]

    SECTION 4: FINANCIAL BARRIER STATEMENT
    [Explanation of why funding is required to proceed, citing the ${payback.toFixed(1)} year payback period]

    Tone: Professional, Technical, Persuasive.
    `;

    try {
        const response = await callGeminiProxy({
            action: 'generateContent',
            model: 'gemini-3-pro-preview',
            prompt,
            config: {},
        });
        return response.text || "Error generating application.";
    } catch (e) {
        console.error("Grant generation failed", e);
        return "Service unavailable. Please try again later.";
    }
};

export const generateActionPlan = async (
    buildingData: BuildingData,
    simContext?: SimulationContext,
    eligibleIncentives?: any[]
): Promise<ActionPlan> => {
    // 1. Sanitize Data
    const { savedScenarios, ...safeBuildingData } = buildingData;

    // Schema Definition for Robust JSON
    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            executiveSummary: { type: Type.STRING },
            phases: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        timeline: { type: Type.STRING },
                        technicalDetails: { type: Type.STRING },
                        standards: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        },
                        steps: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["name", "timeline", "technicalDetails", "standards", "steps"]
                }
            },
            incentiveStrategy: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            },
            localPartners: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        category: { type: Type.STRING },
                        name: { type: Type.STRING },
                        description: { type: Type.STRING }
                    },
                    required: ["category", "name", "description"]
                }
            }
        },
        required: ["title", "executiveSummary", "phases", "incentiveStrategy", "localPartners"]
    };

    const prompt = `
    **TASK:**
    Create an engineer-grade Execution Roadmap for a retrofit project at: ${buildingData.address}.

    **DATA:**
    - Building: ${JSON.stringify(safeBuildingData)}
    - Incentives: ${JSON.stringify(eligibleIncentives)}
    - Simulation Context: ${simContext ? JSON.stringify(simContext) : "N/A"}

    **REQUIREMENTS:**
    1. **Phases:** Break project into 4-5 phases (e.g., Audit, Design, Tender, Construction, Commissioning).
    2. **Structure:** Keep "steps" as short, punchy bullet points.
    3. **Standards:** Include specific codes (ASHRAE, ASTM, NEC) relevant to the measures.
    4. **Incentives:** Outline a strategy to capture the listed incentives.
    5. **Partners:** Suggest types of local partners needed (e.g., "Energy Auditor", "Mechanical Contractor").

    **OUTPUT:**
    Return a JSON object matching the schema.
    `;

    try {
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Action Plan generation timed out")), 60000)
        );

        // Switch to 'gemini-3-flash-preview' for high-speed, stable structured output
        // Removed 'googleSearch' tool to prevent 500 errors during complex structured generation
        const apiPromise = callGeminiProxy({
            action: 'generateContent',
            model: 'gemini-3-flash-preview',
            prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
            }
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);

        const jsonText = response.text?.trim();
        if (!jsonText) throw new Error("Empty response text");

        const parsed = JSON.parse(jsonText);

        return parsed as ActionPlan;

    } catch(e) {
        console.error("Action Plan generation failed", e);
        // Robust Fallback
        return {
            title: "Integrated Retrofit Strategy (Fallback)",
            executiveSummary: "A phased approach to modernize mechanical systems and improve envelope performance. (Note: AI Generation limit reached or timed out)",
            phases: [
                {
                    name: "Phase 1: Assessment",
                    timeline: "Months 1-2",
                    technicalDetails: "Conduct detailed energy auditing.",
                    standards: ["ASHRAE Level 2", "ASTM E779"],
                    steps: ["Engage Energy Auditor", "Review Utility Data"]
                },
                {
                    name: "Phase 2: Design",
                    timeline: "Months 3-5",
                    technicalDetails: "Develop Issued for Construction (IFC) drawings.",
                    standards: ["OBC 2024", "ASHRAE 90.1"],
                    steps: ["Mechanical Engineering Design", "Structural Review for Roof Load"]
                }
            ],
            incentiveStrategy: ["Verify eligibility for Federal Green Heat Grant", "Submit pre-approval for Utility Rebates"],
            localPartners: [
                { category: "Certification", name: "HRAI", description: "Look for HRAI certified contractors for HVAC." },
                { category: "Utility", name: "Local Hydro", description: "Contact for service upgrade assessment." }
            ]
        };
    }
}


export const sendMessageToScout = async (chat: ChatSession, message: string, context?: string): Promise<{text: string, sources: Source[]}> => {
  try {
    const finalMessage = context
        ? `[SYSTEM CONTEXT: The user is currently viewing this data: ${context}]. \n\n USER QUERY: ${message}`
        : message;

    const response = await callGeminiProxy({
        action: 'chat',
        model: chat.model,
        history: chat.history,
        message: finalMessage,
        config: chat.config,
    });

    // Update local history for subsequent messages
    chat.history.push(
        { role: 'user', parts: [{ text: finalMessage }] },
        { role: 'model', parts: [{ text: response.text }] }
    );

    return {
        text: response.text || "I didn't catch that. Could you rephrase?",
        sources: response.sources || [],
    };

  } catch (error: any) {
    console.error("Gemini Chat Error", error);
    return { text: `Communications offline. Error: ${error.message || "Unknown Connection Error"}`, sources: [] };
  }
};
