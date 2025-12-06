import { GoogleGenAI } from "@google/genai";
import { Product, Customer } from "../types";

// Access API key via process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

export const generateCustomerMessage = async (
  customer: Customer,
  newProducts: Product[]
): Promise<string> => {
  if (newProducts.length === 0) return "No new products selected.";

  const productDescriptions = newProducts.map(p => 
    `${p.brand} ${p.type} (${p.color}, Size ${p.size})`
  ).join(", ");

  const prompt = `
    You are an assistant for a trouser trader.
    Write a short, friendly, and professional WhatsApp message to a customer named "${customer.name}".
    
    Context:
    - The customer has previously bought items like: ${customer.preferences.join(", ")}.
    - We have new stock available: ${productDescriptions}.
    - Invite them to check it out.
    - Keep it under 50 words.
    - Do not include placeholders or hashtags.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not generate message.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating message. Please check your API key.";
  }
};
