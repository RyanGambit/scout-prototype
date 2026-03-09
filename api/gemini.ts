import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
  }

  try {
    const { action, model, prompt, config, history, message } = req.body;

    if (action === 'generateContent') {
      const response = await ai.models.generateContent({
        model: model || 'gemini-3.1-pro-preview',
        contents: prompt,
        config: config || {},
      });

      // Extract grounding metadata
      const sources: { title: string; url: string }[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri) {
            let title = chunk.web.title;
            try {
              if (!title) title = new URL(chunk.web.uri).hostname;
            } catch { title = "External Source"; }
            sources.push({ title, url: chunk.web.uri });
          }
        });
      }
      const dedupedSources = Array.from(new Map(sources.map(s => [s.url, s])).values());

      return res.status(200).json({
        text: response.text || '',
        sources: dedupedSources,
      });

    } else if (action === 'chat') {
      // Stateless chat: recreate chat from history, then send new message
      const chat = ai.chats.create({
        model: model || 'gemini-3.1-pro-preview',
        history: history || [],
        config: config || {},
      });

      const response = await chat.sendMessage({ message });

      const sources: { title: string; url: string }[] = [];
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        chunks.forEach((chunk: any) => {
          if (chunk.web?.uri) {
            let title = chunk.web.title;
            try {
              if (!title) title = new URL(chunk.web.uri).hostname;
            } catch { title = "External Source"; }
            sources.push({ title, url: chunk.web.uri });
          }
        });
      }
      const dedupedSources = Array.from(new Map(sources.map(s => [s.url, s])).values());

      return res.status(200).json({
        text: response.text || '',
        sources: dedupedSources,
      });

    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

  } catch (error: any) {
    console.error('Gemini API proxy error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
