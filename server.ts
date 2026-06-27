/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Shared Gemini SDK client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
app.use(express.json());

const PORT = 3000;

// API Route for AI Business Audit Agent
app.post("/api/audit", async (req, res) => {
  try {
    const { companyName, website, category, location } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: "Company name is required." });
    }

    const prompt = `
      You are a brilliant sales intelligence agent and digital strategist for Radbit Studios.
      Your task is to conduct a digital audit of the following tourism operator business:
      - Business Name: ${companyName}
      - Website: ${website || "No website"}
      - Category: ${category || "Unknown"}
      - Location: ${location || "Unknown"}

      Think like a sales strategist aiming to close high-value deals. Do not describe generic technical details like "you need SSL" or "you need meta tags".
      Focus entirely on business impact, conversion optimization, and direct booking revenue. Identify where the business is leaking money.

      Assess:
      1. Has website? (true/false)
      2. Has direct booking engine? (true/false)
      3. Has prominent WhatsApp contact/booking CTA? (true/false)
      4. Mobile experience and performance quality (Excellent/Good/Fair/Poor)
      5. SEO quality (Strong/Moderate/Weak)
      6. Trust signals (Strong/Moderate/Weak - reviews, testimonials, social proofs)
      7. Identified Revenue Problems (e.g. "No direct booking", "Weak mobile experience", "Missing WhatsApp call-to-action", "Complex navigation preventing booking")
      8. Revenue Generation Opportunities (e.g. "Direct booking engine integration", "WhatsApp chatbot automation", "Mobile-optimized booking path")
      9. Recommended Pitch (A concise, persuasive sales angle focusing on revenue, direct bookings, and client conversion)
      10. Recommended Radbit Studios Package
      11. Estimated Project Value in USD.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            digitalScore: {
              type: Type.INTEGER,
              description: "A score from 0 to 100 assessing the business's current digital presence.",
            },
            hasWebsite: {
              type: Type.BOOLEAN,
              description: "True if they have a working website, false otherwise.",
            },
            hasBookingSystem: {
              type: Type.BOOLEAN,
              description: "True if they have an active online reservation/booking engine, false otherwise.",
            },
            hasWhatsapp: {
              type: Type.BOOLEAN,
              description: "True if they have a clear WhatsApp chat widget or button, false otherwise.",
            },
            mobileQuality: {
              type: Type.STRING,
              description: "Assess quality of mobile rendering: Excellent, Good, Fair, or Poor.",
            },
            seoQuality: {
              type: Type.STRING,
              description: "Assess SEO standing: Strong, Moderate, or Weak.",
            },
            trustSignals: {
              type: Type.STRING,
              description: "Assess credibility markers: Strong, Moderate, or Weak.",
            },
            problems: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Core revenue leakages or user experience problems.",
            },
            opportunities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Revenue-generating solutions and high-value upgrades.",
            },
            recommendedPitch: {
              type: Type.STRING,
              description: "A compelling value-focused pitch for the Radbit Studios sales team to use.",
            },
            recommendedPackage: {
              type: Type.STRING,
              description: "The name of the package proposed (e.g. Custom Booking System, Mobile First Redesign).",
            },
            estimatedProjectValue: {
              type: Type.INTEGER,
              description: "The recommended deal size in USD (e.g., between 1500 and 8000 depending on complexity).",
            },
          },
          required: [
            "digitalScore",
            "hasWebsite",
            "hasBookingSystem",
            "hasWhatsapp",
            "mobileQuality",
            "seoQuality",
            "trustSignals",
            "problems",
            "opportunities",
            "recommendedPitch",
            "recommendedPackage",
            "estimatedProjectValue",
          ],
        },
      },
    });

    const resultText = response.text?.trim() || "{}";
    const parsedResult = JSON.parse(resultText);

    res.json(parsedResult);
  } catch (error) {
    console.error("AI Audit error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to run AI business audit." });
  }
});

// API Route for AI Outreach Generator
app.post("/api/outreach", async (req, res) => {
  try {
    const { lead, analysis } = req.body;

    if (!lead) {
      return res.status(400).json({ error: "Lead information is required." });
    }

    const companyName = lead.companyName;
    const category = lead.category || "tourism operator";
    const location = lead.location || "Zimbabwe";
    const contactName = lead.notes ? "the Team" : "team";

    const problemsList = analysis?.problems?.join(", ") || "lacking direct booking features and mobile-optimized conversion funnel";
    const oppsList = analysis?.opportunities?.join(", ") || "adding a high-converting direct booking engine and automated WhatsApp channel";

    const prompt = `
      You are an expert sales strategist crafting personalized outreach for a tourism operator:
      - Operator: ${companyName} (${category})
      - Location: ${location}
      - Website: ${lead.website || "No website"}
      
      Our agency: Radbit Studios.
      Core Value Proposition: "We help tourism operators increase direct enquiries and bookings."

      Identified Problems: ${problemsList}
      Identified Opportunities: ${oppsList}

      Rules for messages:
      1. OPENING: Make a highly personalized observation about their business or website presence.
      2. MIDDLE: Address a specific revenue problem (e.g., losing bookings to OTA fees, poor mobile reservation, friction in contacting).
      3. CLOSE: Present a low-friction, high-value Call to Action (e.g., booking a brief 10-minute audit view, getting a free mobile mockup).
      4. STRICT NEGATIVE CONSTRAINT: Never say "We build websites" or "we do web design".
      5. POSITIVE CONSTRAINT: Explicitly focus on "helping increase direct enquiries and bookings" and reducing reliance on high-fee OTAs.
      6. Style: Professional, concise, engaging, and highly conversion-focused. No cheesy exclamation marks.

      Generate three specific assets:
      1. A high-converting WhatsApp message (short, direct, mobile-friendly, with line breaks).
      2. A personalized sales email (with a Subject line and clean, readable email body).
      3. A short, low-pressure follow-up message (perfect for secondary touchpoints on WhatsApp or email).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whatsapp: {
              type: Type.STRING,
              description: "WhatsApp message with clear line breaks and low friction CTA.",
            },
            emailSubject: {
              type: Type.STRING,
              description: "Compelling email subject line.",
            },
            emailBody: {
              type: Type.STRING,
              description: "Personalized, professional sales email body.",
            },
            followUp: {
              type: Type.STRING,
              description: "A short, low-friction secondary follow-up message.",
            },
          },
          required: ["whatsapp", "emailSubject", "emailBody", "followUp"],
        },
      },
    });

    const resultText = response.text?.trim() || "{}";
    const parsedResult = JSON.parse(resultText);

    res.json(parsedResult);
  } catch (error) {
    console.error("AI Outreach error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate outreach materials." });
  }
});

async function startServer() {
  // Serve frontend with Vite in development, static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
