import { GoogleGenerativeAI } from '@google/generative-ai';
import Constants from 'expo-constants';

const geminiApiKey = Constants.expoConfig?.extra?.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY!;

if (!geminiApiKey) {
  console.warn('⚠️ Gemini API key is missing. AI features will be disabled.');
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",        // fast + good at vision (free tier friendly)
});

export type AiSuggestion = {
  suggestedTitle: string;
  category: string;
  severity: 'Low' | 'Medium' | 'High';
  confidence: number;               // 0-100
  reason: string;
};

export async function getAiSuggestion(
  description: string,
  photoBase64?: string          // optional image as base64
): Promise<AiSuggestion> {
  try {
    let prompt = `
You are a helpful civic complaint assistant for Nepal municipalities.

Analyze this complaint and return ONLY a valid JSON object with these exact keys:
{
  "suggestedTitle": "short clear title (max 60 characters)",
  "category": "one of: Road, Garbage, Water, Electricity, Street Light, Other",
  "severity": "Low | Medium | High",
  "confidence": number between 60 and 98,
  "reason": "one short sentence explaining why"
}

Complaint description: "${description}"

Rules:
- Categories must be exactly from the list above.
- Severity: High = safety risk or urgent (flooding, big pothole, live wire), Medium = inconvenience, Low = minor.
- Be accurate for Nepali context (e.g., monsoon garbage, road damage in Kathmandu).
`;

    const contents: any[] = [{ text: prompt }];

    // If photo is provided, add it (multimodal)
    if (photoBase64) {
      contents.push({
        inlineData: {
          data: photoBase64.replace(/^data:image\/\w+;base64,/, ''),
          mimeType: "image/jpeg",
        },
      });
    }

    const result = await model.generateContent(contents);
    const responseText = result.response.text();

    // Extract JSON safely
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AiSuggestion;
    }

    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('AI Suggestion Error:', error);
    
    // Fallback when AI fails (never break the form)
    return {
      suggestedTitle: description.slice(0, 60),
      category: 'Other',
      severity: 'Medium',
      confidence: 50,
      reason: 'AI service unavailable, using fallback',
    };
  }
}