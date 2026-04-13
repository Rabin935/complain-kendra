import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables.");
}

const client = new GoogleGenerativeAI(apiKey);

export const geminiModel = client.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export default client;
