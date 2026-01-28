
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
      Return a list of locations with realistic dates starting from ${currentYear}.
      
      Valid locations include:
      1. All Countries (e.g., "Japan", "France", "Brazil", "Kenya").
      2. All 50 United States (e.g., "California", "Texas", "New York", "Florida").
      
      IMPORTANT FORMATTING RULES:
      - For Countries: Use the common English name (e.g., "South Korea", "Vietnam").
      - For US States: Return ONLY the state name. Do NOT prefix with 'US', 'USA', or 'State of'. 
        - Correct: "California"
        - Incorrect: "USA - California", "US California"
      
      Ensure names match standard English naming conventions found on maps.
    `;

    // FIX: Using gemini-3-flash-preview for text tasks as per guidelines.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
