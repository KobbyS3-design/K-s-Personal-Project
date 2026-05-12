import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const askDrugInfo = async (query: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "AI Service Unavailable: Missing API configuration.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a helpful medical assistant for a nurse. Provide brief, concise, and clinically accurate information about medications.
      Query: ${query}`,
    });
    return response.text || "No information available.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error.status === 403) {
      return "Access Denied: The API key does not have permission for this model or the model name is incorrect.";
    }
    if (error.status === 429) {
      return "Rate limit exceeded. Please wait a moment before trying again.";
    }
    
    return "Error retrieving clinical information. Please check your network connection.";
  }
};

export const parseMedicationFromAudio = async (audioBase64: string, mimeType: string) => {
  const ai = getAiClient();
  if (!ai) throw new Error("AI Client not initialized");

  const prompt = `Listen to the medical professional dictating a medication order. 
  Extract the details into a structured JSON object.

  Rules for extraction:
  1. Frequency mapping:
     - "Once a day", "Daily", "QD" -> DAILY
     - "Twice a day", "BID", "12 hourly" -> BD
     - "Three times a day", "TID", "8 hourly" -> TID
     - "Four times a day", "QID", "6 hourly" -> QID
     - "As needed", "PRN" -> PRN
     - "Immediately", "Stat", "Now" -> STAT
     - If a specific hour interval is given -> CUSTOM and set intervalHours.
  2. Route mapping: PO, IV, IM, SC, TOP, INH, PR.
  3. Form: Tablet, Capsule, Syrup, Injection, etc.
  4. Notes: Capture any special instructions.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType, data: audioBase64 } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the medication" },
          dose: { type: Type.STRING, description: "Dose with units e.g. 500mg" },
          form: { type: Type.STRING, description: "Form e.g. Tablet, Capsule" },
          route: { type: Type.STRING, description: "Route code e.g. PO, IV" },
          frequency: { type: Type.STRING, description: "One of: STAT, BD, TID, QID, DAILY, PRN, CUSTOM" },
          intervalHours: { type: Type.NUMBER, description: "Only if frequency is CUSTOM" },
          notes: { type: Type.STRING, description: "Special instructions" }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
};