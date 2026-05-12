import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface TriageResult {
  urgency: "URGENT" | "ELEVATED" | "STANDARD";
  reason: string;
  suggestedCategory: string;
}

export async function triagePrayer(text: string): Promise<TriageResult> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Triage this church prayer request for pastoral care. 
      Urgency Levels:
      - URGENT: Life safety, death, abuse, suicide risk, severe medical crisis.
      - ELEVATED: Significant life events, major loss, intense personal struggle.
      - STANDARD: General health, travel, spiritual life, everyday needs.
      
      Prayer text: "${text}"`,
      config: {
        systemInstruction: "You are a pastoral assistant helping elders classify prayer requests for triage. Be compassionate but objective about urgency levels.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            urgency: {
              type: Type.STRING,
              enum: ["URGENT", "ELEVATED", "STANDARD"],
              description: "The priority level for pastoral response."
            },
            reason: {
              type: Type.STRING,
              description: "A brief 1-sentence explanation of why this level was chosen (visible to elders only)."
            },
            suggestedCategory: {
              type: Type.STRING,
              description: "One of: Health, Family, Work, Crisis, Grief, Spiritual, Other."
            }
          },
          required: ["urgency", "reason", "suggestedCategory"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      urgency: result.urgency || "STANDARD",
      reason: result.reason || "Automatic classification",
      suggestedCategory: result.suggestedCategory || "Other"
    };
  } catch (error) {
    console.error("Triage failed:", error);
    return {
      urgency: "STANDARD",
      reason: "Triage service unavailable",
      suggestedCategory: "Other"
    };
  }
}
