import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import admin from "firebase-admin";
import dotenv from "dotenv";

// Load environment variables from .env file
const result = dotenv.config({ path: path.join(process.cwd(), ".env") });
fs.appendFileSync("debug.log", `Dotenv result: ${JSON.stringify(result)}\n`);
if (result.error) {
  console.warn("Dotenv could not load .env file:", result.error);
} else {
  console.log(".env file loaded successfully");
}
fs.appendFileSync("debug.log", `MY_CUSTOM_GEMINI_API_KEY: ${process.env.MY_CUSTOM_GEMINI_API_KEY ? "set" : "not set"}\n`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase config
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let db: admin.firestore.Firestore | null = null;

if (fs.existsSync(firebaseConfigPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
  
  // Initialize Firebase Admin SDK
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
  }
  
  // Use the specific database ID if provided, otherwise use default
  db = firebaseConfig.firestoreDatabaseId ? admin.firestore(firebaseConfig.firestoreDatabaseId) : admin.firestore();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(bodyParser.json());

  // AI Tools metadata (Static)
  const aiTools = [
    {
      id: 'security-audit',
      name: 'Security Audit',
      description: 'Deep scan for SQL injection, XSS, and other vulnerabilities.',
      icon: 'ShieldAlert',
      prompt: 'Perform a comprehensive security audit on this code. Focus on common vulnerabilities like injection, broken authentication, and sensitive data exposure.'
    },
    {
      id: 'performance-check',
      name: 'Performance Optimizer',
      description: 'Identify bottlenecks and suggest algorithmic improvements.',
      icon: 'Zap',
      prompt: 'Analyze this code for performance bottlenecks. Suggest optimizations for time and space complexity.'
    },
    {
      id: 'refactor-pro',
      name: 'Refactor Pro',
      description: 'Clean up technical debt and improve code readability.',
      icon: 'Wand2',
      prompt: 'Suggest refactoring for this code to improve readability, maintainability, and adherence to clean code principles.'
    },
    {
      id: 'test-generator',
      name: 'Unit Test Generator',
      description: 'Automatically generate test cases for your functions.',
      icon: 'TestTube2',
      prompt: 'Generate comprehensive unit tests for this code using a popular testing framework suitable for the language.'
    }
  ];

  // Webhook endpoint - Saves to Firestore
  app.post("/api/webhook", async (req, res) => {
    const { code, language, title } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const newWebhook = {
      code,
      language: language || "javascript",
      title: title || "External Webhook Request",
      timestamp: new Date().toISOString(),
      status: "pending"
    };

    try {
      if (db) {
        const docRef = await db.collection('webhooks').add(newWebhook);
        console.log("Received webhook and saved to Firestore:", docRef.id);
        res.json({ message: "Webhook received and saved", id: docRef.id });
      } else {
        console.warn("Firestore not initialized, webhook not saved.");
        res.status(503).json({ error: "Database not initialized" });
      }
    } catch (err) {
      console.error("Error saving webhook to Firestore:", err);
      res.status(500).json({ error: "Failed to save webhook" });
    }
  });

  // AI Review endpoint
  app.post("/api/review", async (req, res) => {
    const { code, language, customPrompt } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const basePrompt = customPrompt || `Review the following ${language} code. Identify bugs, provide fixed code, and explain the changes.`;
    const prompt = `${basePrompt}\n\nCode:\n${code}`;

    try {
      fs.appendFileSync("debug.log", `Request received. MY_CUSTOM_GEMINI_API_KEY: ${process.env.MY_CUSTOM_GEMINI_API_KEY ? "set" : "not set"}, GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "set" : "not set"}\n`);
      console.log("Checking API keys:", {
        customKey: process.env.MY_CUSTOM_GEMINI_API_KEY ? "set" : "not set",
        defaultKey: process.env.GEMINI_API_KEY ? "set" : "not set"
      });
      const apiKey = process.env.MY_CUSTOM_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        console.error("GEMINI_API_KEY is missing or has placeholder value.");
        const keyLength = apiKey ? apiKey.length : 0;
        return res.status(500).json({ error: `DEBUG_ERROR_CODE_123: API key length is ${keyLength}. Please check your .env file.` });
      }

      // Log key info safely for debugging
      console.log(`Using API key: length=${apiKey.length}, prefix=${apiKey.substring(0, 4)}...`);

      const { GoogleGenAI, Type } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bugs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    line: { type: Type.INTEGER },
                    description: { type: Type.STRING },
                    severity: { type: Type.STRING, enum: ['low', 'medium', 'high'] }
                  },
                  required: ['line', 'description', 'severity']
                }
              },
              fixedCode: { type: Type.STRING },
              explanation: { type: Type.STRING }
            },
            required: ['bugs', 'fixedCode', 'explanation']
          }
        }
      });

      const responseText = response.text || "{}";
      try {
        res.json(JSON.parse(responseText));
      } catch (parseErr) {
        console.error("Failed to parse AI response as JSON:", responseText);
        fs.appendFileSync("debug.log", `Failed to parse AI response as JSON: ${responseText}\n`);
        throw new Error("AI returned an invalid response format. Please try again.");
      }
    } catch (err: any) {
      console.error("Error performing AI review:", err);
      fs.appendFileSync("debug.log", `Error performing AI review: ${err.message || err}\n`);
      if (err.stack) {
        fs.appendFileSync("debug.log", `Stack trace: ${err.stack}\n`);
      }
      res.status(500).json({ error: err.message || "Failed to perform AI review" });
    }
  });

  // AI Tools endpoint
  app.get("/api/tools", (req, res) => {
    res.json(aiTools);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
