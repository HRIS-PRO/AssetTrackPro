
import { GoogleGenAI } from "@google/genai";

export async function getAssetInsights(assets: any[]) {
  // Use direct process.env.API_KEY as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Based on the following asset data, provide 3 brief strategic insights for management (maintenance trends, cost optimization, or lifecycle management): ${JSON.stringify(assets)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert enterprise asset consultant. Be concise and professional.",
      }
    });
    // Accessing the .text property directly as per SDK guidelines
    return response.text;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return "Insights unavailable at this time.";
  }
}
