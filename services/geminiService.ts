import { GoogleGenAI, Type } from "@google/genai";
import { ExpansionEvent } from "../types";

const generateExpansionPlan = async (prompt: string, currentYear: number): Promise<Partial<ExpansionEvent>[]> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.warn("API Key not found. Returning empty plan.");
      return [];
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const systemInstruction = `
      You are a strategic business consultant. 
      Generate a global expansion timeline based on the user's request.
      Return a list of countries with realistic dates starting from ${currentYear}.
      Only use valid country names that exist on a standard world map.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              countryName: { type: Type.STRING },
              year: { type: Type.INTEGER },
              month: { type: Type.INTEGER },
              day: { type: Type.INTEGER },
              description: { type: Type.STRING },
            },
            required: ["countryName", "year", "month", "day"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as Partial<ExpansionEvent>[];

  } catch (error) {
    console.error("Gemini API Error:", error);
    return [];
  }
};

export { generateExpansionPlan };
