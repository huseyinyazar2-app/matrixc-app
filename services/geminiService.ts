
import { GoogleGenAI } from "@google/genai";
import { Sale, Product, Customer } from '../types';

const getAIClient = () => {
  // In a real app, this would handle missing keys more gracefully
  if (!process.env.API_KEY) {
    console.warn("API_KEY not found in environment variables.");
    return null;
  }
  // Correctly initialize GoogleGenAI with named parameter
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateBusinessInsights = async (
  sales: Sale[],
  products: Product[],
  customers: Customer[]
): Promise<string> => {
  const client = getAIClient();
  if (!client) return "API Key missing. Cannot generate insights.";

  // Prepare data summary for the AI
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const lowStockProducts = products
    .filter(p => p.stockQuantity <= p.lowStockThreshold)
    .map(p => `${p.baseName} (${p.variantName})`);
    
  const topDebtors = customers
    .filter(c => c.currentBalance < 0)
    .sort((a, b) => a.currentBalance - b.currentBalance) // Ascending because negative is debt
    .slice(0, 3)
    .map(c => `${c.name} (${c.currentBalance} TL)`);

  const prompt = `
    You are a business analyst for a manufacturing retail company. Analyze the following data and provide 3 short, actionable insights in Turkish language.
    
    Data:
    - Total Revenue: ${totalRevenue} TL
    - Total Sales Count: ${sales.length}
    - Low Stock Products: ${lowStockProducts.join(', ') || 'None'}
    - Top Debtors (Customers owing money): ${topDebtors.join(', ') || 'None'}
    
    Format the response as a markdown list. Focus on cash flow, inventory risks, and collection priorities.
  `;

  try {
    // Use gemini-3-flash-preview as per guidelines for Basic Text Tasks
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Access .text property directly (not a method)
    return response.text || "Analiz oluşturulamadı.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Yapay zeka servisine şu an ulaşılamıyor.";
  }
};
