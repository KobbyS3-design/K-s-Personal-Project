
import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const askDrugInfo = async (query: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI Service Unavailable: Missing API Key. Please click 'Config Key' in Settings.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a helpful medical assistant for a nurse. Keep answers extremely brief, concise, and clinically relevant. 
      Query: ${query}`,
    });
    return response.text || "No information available.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error.status === 403) {
      return "Permission Denied (403). Please click 'Config Key' in Settings to select a valid API key.";
    }
    if (error.status === 429) {
      return "Rate limit exceeded (429). The free tier limit has been reached. Please try again in a minute.";
    }
    
    return "Error retrieving information. Please check your connection.";
  }
};
