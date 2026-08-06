import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const maxDuration = 300; // 5 min pour Puppeteer + Gemini sur Vercel

interface SectionScore {
  name: string;
  score: number;
  max: number;
  issues: string[];
  wins: string[];
}

interface AnalysisResult {
  url: string;
  screenshot: string;
  totalScore: number;
  sections: SectionScore[];
  topWins: string[];
  shareId: string;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }

    // Validation URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!parsedUrl.protocol.startsWith("http")) {
        throw new Error("Protocol invalide");
      }
    } catch {
      return NextResponse.json({ error: "URL invalide ou malformée" }, { status: 400 });
    }

    console.log(`[Landing Roast] Analyse de ${url}`);

    // 1. Screenshot + extraction HTML
    const isProduction = process.env.VERCEL_ENV === "production";
    const browser = await puppeteer.launch({
      args: isProduction ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: isProduction
        ? await chromium.executablePath()
        : process.platform === "win32"
          ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
          : process.platform === "darwin"
            ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            : "/usr/bin/google-chrome",
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    try {
      await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    } catch (error) {
      await browser.close();
      console.error(`[Landing Roast] Erreur chargement ${url}:`, error);
      return NextResponse.json(
        { error: "Impossible de charger la page (timeout ou erreur réseau)" },
        { status: 500 }
      );
    }

    // Screenshot desktop
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    const screenshotBase64 = `data:image/png;base64,${Buffer.from(screenshotBuffer).toString("base64")}`;

    // HTML extraction
    const htmlContent = await page.content();
    const pageTitle = await page.title();

    // Mobile viewport screenshot
    await page.setViewport({ width: 375, height: 667 });
    await page.reload({ waitUntil: "networkidle0" });
    const mobileScreenshotBuffer = await page.screenshot({ fullPage: false });
    const mobileScreenshotBase64 = `data:image/png;base64,${Buffer.from(mobileScreenshotBuffer).toString("base64")}`;

    await browser.close();

    // 2. Analyse IA via Gemini
    const prompt = `Tu es un expert en conversion de landing pages B2B paid (LinkedIn Ads, Google Ads, Meta Ads).

Analyse cette landing page et note-la selon ce barème STRICT (total 100 points) :

**HERO (20 points)**
- Headline clair, bénéfice immédiat visible (8pts)
- Subheadline complète la promesse (4pts)
- CTA above the fold, contraste fort (8pts)

**VALUE PROPOSITION (20 points)**
- Bénéfices > features (8pts)
- Pain points adressés explicitement (7pts)
- Différenciation vs concurrence (5pts)

**TRUST SIGNALS (15 points)**
- Logos clients / partenaires (5pts)
- Témoignages avec photo + nom + poste (5pts)
- Chiffres / résultats concrets (5pts)

**CTA & CONVERSION (20 points)**
- CTA répété 2-3x sur la page (7pts)
- Form ultra court (3 champs max) (8pts)
- Copy CTA orienté bénéfice (pas "Envoyer") (5pts)

**MOBILE (15 points)**
- Hero lisible mobile (screenshot fourni) (8pts)
- CTA tapable facilement (7pts)

**CLARTÉ & STRUCTURE (10 points)**
- Sections claires, hiérarchie visuelle (5pts)
- Pas de jargon / buzzwords vides (5pts)

---

**PAGE TITLE** : ${pageTitle}

**HTML** (extrait 15000 premiers caractères) :
${htmlContent.substring(0, 15000)}

---

**SCREENSHOT DESKTOP fourni** (analyse visuelle hero, CTA position, contraste).
**SCREENSHOT MOBILE fourni** (lisibilité, CTA tapable).

**FORMAT DE RÉPONSE JSON STRICT** :

{
  "sections": [
    {
      "name": "Hero",
      "score": X,
      "max": 20,
      "issues": ["Headline trop vague", "CTA pas visible above fold"],
      "wins": ["Utilise des verbes d'action forts"]
    },
    {
      "name": "Value Proposition",
      "score": X,
      "max": 20,
      "issues": [...],
      "wins": [...]
    },
    {
      "name": "Trust Signals",
      "score": X,
      "max": 15,
      "issues": [...],
      "wins": [...]
    },
    {
      "name": "CTA & Conversion",
      "score": X,
      "max": 20,
      "issues": [...],
      "wins": [...]
    },
    {
      "name": "Mobile",
      "score": X,
      "max": 15,
      "issues": [...],
      "wins": [...]
    },
    {
      "name": "Clarté & Structure",
      "score": X,
      "max": 10,
      "issues": [...],
      "wins": [...]
    }
  ],
  "topWins": [
    "Quick win #1 précis et actionnable",
    "Quick win #2 précis et actionnable",
    "Quick win #3 précis et actionnable"
  ]
}

**RÈGLES** :
- Sois SÉVÈRE : une LP moyenne = 40-60/100, une excellente = 75+
- "issues" = problèmes concrets observés
- "wins" = actions précises pour gagner des points (ex: "Ajoute un témoignage avec photo en section 2")
- topWins = les 3 quick wins les plus impactants (gains rapides)
- Réponds UNIQUEMENT en JSON valide, aucun texte avant/après`;

    const geminiResponse = await genAI.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            sections: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  score: { type: "INTEGER" },
                  max: { type: "INTEGER" },
                  issues: { type: "ARRAY", items: { type: "STRING" } },
                  wins: { type: "ARRAY", items: { type: "STRING" } },
                },
                required: ["name", "score", "max", "issues", "wins"],
              },
            },
            topWins: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
          required: ["sections", "topWins"],
        },
      },
    });

    const responseText = geminiResponse.text || "";
    console.log("[Landing Roast] Réponse Gemini (raw):", responseText);

    // Parse JSON (schema forcé donc devrait être clean)
    let analysisData: { sections: SectionScore[]; topWins: string[] };
    try {
      analysisData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("[Landing Roast] Erreur parsing JSON:", parseError);
      console.error("Réponse brute:", responseText);
      return NextResponse.json({ error: "Erreur analyse IA (format réponse invalide)" }, { status: 500 });
    }

    // Calcul score total
    const totalScore = analysisData.sections.reduce((sum, s) => sum + s.score, 0);

    // Share ID (6 chars aléatoires)
    const shareId = Math.random().toString(36).substring(2, 8);

    const result: AnalysisResult = {
      url,
      screenshot: screenshotBase64,
      totalScore,
      sections: analysisData.sections,
      topWins: analysisData.topWins,
      shareId,
    };

    // TODO: stocker en DB pour share link (pour MVP on skip, on renvoie direct)
    console.log(`[Landing Roast] Analyse terminée : ${totalScore}/100`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Landing Roast] Erreur serveur:", error);
    return NextResponse.json({ error: "Erreur interne serveur" }, { status: 500 });
  }
}
