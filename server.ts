import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const port = 3000;

// Lazy initialization of Gemini client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it to Settings > Secrets.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Check Endpoint
  app.get("/api/config", (req, res) => {
    res.json({
      hasApiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // API Endpoint: Discussion Partner Generation
  app.post("/api/discuss", async (req, res) => {
    try {
      const { messages, topic, focusExpressions } = req.body;

      if (!topic) {
        return res.status(400).json({ error: "Topic is required" });
      }

      const client = getGeminiClient();

      // We reconstruct context for Gemini.
      // We will map system instruction using the topic and expressions.
      const expressionsList = focusExpressions && focusExpressions.length > 0
        ? `Here are some expressions the user is focusing on: ${focusExpressions.join(", ")}. Notice if they use them.`
        : "";

      const systemInstruction = `You are a highly articulate, constructing English conversational partner. You are helping the user practice formal and informal discussion expressions for exams like IELTS, TOEFL, work meetings, or debates.

Active Discussion Topic: "${topic}"

Your instructions:
1. Play the role of a supportive but intellectually engaging peer.
2. Keep your replies relatively concise (2 to 4 sentences maximum).
3. Do not dominate the conversation. Offer one interesting angle, optionally concede a part of their point if reasonable, and end with an engaging open-ended question that prompts them to speak.
4. Maintain a natural, conversational, and respectful tone. Do not write introductory sentences like "As your partner, I think..." or "That is a great choice of expression!" — just stay in character as a human discussant.
5. Do not explicitly say you are an AI. Make it feel like a real speech exchange.
${expressionsList}`;

      // Convert messages array to Gemini contents parameter structure.
      // Roles in GoogleGenAI contents should be "user" and "model".
      // Let's filter out system messages if any, and map others.
      const contents = (messages || []).map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      }));

      // If empty, prime the discussion conversation
      if (contents.length === 0) {
        contents.push({
          role: "user",
          parts: [{ text: `Let's start our conversation on the topic: "${topic}". Please introduce the topic and express your opening position briefly.` }],
        });
      }

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.8,
        },
      });

      res.json({ content: response.text || "" });
    } catch (error: any) {
      console.error("Error in /api/discuss:", error);
      res.status(500).json({
        error: error.message || "An unexpected error occurred during the discussion",
        needsApiKey: !process.env.GEMINI_API_KEY,
      });
    }
  });

  // API Endpoint: End session and evaluate performance
  app.post("/api/evaluate", async (req, res) => {
    try {
      const { messages, topic, targetExpressions } = req.body;

      if (!messages || messages.length === 0) {
        return res.status(400).json({ error: "No messages to evaluate" });
      }

      const client = getGeminiClient();

      // List of all Target expressions to help Gemini find them
      const formatList = targetExpressions ? targetExpressions.map((e: any) => `"${e.text}" (Category: ${e.category})`).join("\n") : "";

      const prompt = `Please review the following English conversation on the topic "${topic}".
Evaluate the user's performance, focusing on how well and how naturally they used conversational discussion expressions.

Conversation transcript to analyze:
${messages.map((m: any) => `${m.role === "user" ? "User: " : "Partner: "}${m.content}`).join("\n")}

Here is the master list of expressions we are tracking. Check which ones the user successfully used (even with minor tense or helper verb adjustment, e.g., "From my own experience" vs "From my experience"):
${formatList}

Provide your feedback strictly in a JSON format matching the schema below:
{
  "score": number, // Overall debate and language fluency score out of 100
  "expressionsUsedCount": number, // count of verified expressions used
  "expressionsUsed": [
    {
      "text": string, // the expression text
      "category": string, // category of the expression
      "contextOk": boolean, // was it used in the correct context?
      "quote": string // quote from the transcript showing where they used it
    }
  ],
  "fluencyFeedback": string, // Constructive feedback on sentence flow, pronunciation/flow style, filler words. Keep it encouraging! (2-3 sentences)
  "vocabularyTips": string, // 2-3 specific recommendations for other phrases they could have used in these specific moments to raise their TOEFL/IELTS band.
  "grammarCorrections": [
    {
      "original": string, // original user quote with errors (empty if none)
      "corrected": string, // corrected version
      "explanation": string // why the change helps
    }
  ],
  "suggestedExpressions": string[] // list of 3 specific expressions from our list that would have fit beautifully in this specific flow. e.g. ["I agree in principle, however...", "Another perspective might be..."]
}

Ensure your response is valid JSON. Do not include markdown wraps like \`\`\`json.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2, // Low temperature for high evaluation accuracy and valid JSON
        },
      });

      const responseText = response.text || "{}";
      const evaluationResult = JSON.parse(responseText.trim());
      res.json(evaluationResult);
    } catch (error: any) {
      console.error("Error in /api/evaluate:", error);
      res.status(500).json({
        error: error.message || "An unexpected error occurred during evaluation",
        needsApiKey: !process.env.GEMINI_API_KEY,
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

startServer();
