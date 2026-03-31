import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import admin from "firebase-admin";

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
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        console.error("GEMINI_API_KEY is missing or has placeholder value.");
        return res.status(500).json({ error: "Gemini API key is not configured. Please add it to your secrets in the AI Studio Settings menu." });
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

      res.json(JSON.parse(response.text || "{}"));
    } catch (err) {
      console.error("Error performing AI review:", err);
      res.status(500).json({ error: "Failed to perform AI review" });
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
