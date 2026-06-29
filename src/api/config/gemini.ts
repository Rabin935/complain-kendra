import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export const geminiClient = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const geminiModel = geminiClient
  ? geminiClient.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    })
  : null;

export default geminiClient;
