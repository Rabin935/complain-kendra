import { geminiModel } from "../config/gemini";
import type { COMPLAINT_CATEGORIES } from "../types";
import { AppError } from "../utils/appError";

interface AnalysisResult {
  suggestedTitle: string;
  category: string;
  severity: number;
  summary: string;
  keywords: string[];
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch (error) {
    console.error("Error fetching image:", error);
    throw new AppError("Failed to process image URL.", 500);
  }
}

export async function analyzeComplaint(
  description: string,
  photoUrl?: string,
): Promise<AnalysisResult> {
  if (!description || description.trim().length === 0) {
    throw new AppError("Complaint description is required for analysis.", 400);
  }

  const complaintCategories: typeof COMPLAINT_CATEGORIES = [
    "Infrastructure",
    "Public Service",
    "Environmental",
    "Safety",
    "Sanitation",
    "Other",
  ];

  const systemPrompt = `You are an expert complaint classifier and analyzer. 
Analyze the provided complaint description and image (if provided) to generate structured analysis.
Your task is to:
1. Suggest an appropriate title (max 100 characters)
2. Categorize the complaint into one of: ${complaintCategories.join(", ")}
3. Rate severity on a scale of 1-10 (1=minor, 10=critical)
4. Provide a concise summary (2-3 sentences)
5. Extract 3-5 relevant keywords

Respond ONLY with a valid JSON object in this exact format:
{
  "suggestedTitle": "string",
  "category": "string (must be one of the predefined categories)",
  "severity": number,
  "summary": "string",
  "keywords": ["string", "string", "string"]
}

Do not include any text outside the JSON. The complaint description may be in Nepali or English.`;

  const userPrompt = photoUrl
    ? `Please analyze the following complaint with the attached image:\n\n${description}`
    : `Please analyze the following complaint:\n\n${description}`;

  try {
    // Build the request content
    let content: Parameters<typeof geminiModel.generateContent>[0];

    if (photoUrl) {
      // Fetch and encode the image
      const base64Image = await fetchImageAsBase64(photoUrl);

      content = [
        {
          role: "user",
          parts: [
            {
              text: userPrompt,
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
          ],
        },
      ];
    } else {
      content = [
        {
          role: "user",
          parts: [
            {
              text: userPrompt,
            },
          ],
        },
      ];
    }

    // Generate response with system instruction
    const response = await geminiModel.generateContent({
      contents: content,
      systemInstruction: systemPrompt,
    });

    const result = response.response.text();

    // Parse the JSON response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new AppError("Invalid response format from AI model.", 500);
    }

    const analysis = JSON.parse(jsonMatch[0]) as AnalysisResult;

    // Validate required fields
    if (
      !analysis.suggestedTitle ||
      !analysis.category ||
      typeof analysis.severity !== "number" ||
      !analysis.summary ||
      !Array.isArray(analysis.keywords)
    ) {
      throw new AppError("Incomplete analysis from AI model.", 500);
    }

    // Validate severity is within range
    if (analysis.severity < 1 || analysis.severity > 10) {
      analysis.severity = Math.max(1, Math.min(10, Math.round(analysis.severity)));
    }

    // Validate category
    if (!complaintCategories.includes(analysis.category as (typeof COMPLAINT_CATEGORIES)[number])) {
      analysis.category = "Other";
    }

    return analysis;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AppError("Failed to parse AI response.", 500);
    }

    if (error instanceof AppError) {
      throw error;
    }

    console.error("AI analysis error:", error);
    throw new AppError("Complaint analysis failed. Please try again.", 500);
  }
}
