# Landing Roast

**Analyse IA de landing pages B2B optimisées conversion paid.**

Soumets une URL → reçois un **score /100** + **3 quick wins** gratuits.

Upsell : **Audit complet système + funnel conversion · 490€** (Cal.com).

---

## 🎯 Features

### ✅ MVP Gratuit
- **Screenshot desktop + mobile** (Puppeteer)
- **Score /100** détaillé par section :
  - Hero (20pts)
  - Value Proposition (20pts)
  - Trust Signals (15pts)
  - CTA & Conversion (20pts)
  - Mobile (15pts)
  - Clarté & Structure (10pts)
- **Analyse IA** via Gemini 2.0 Flash (gratuit aistudio.google.com)
- **Top 3 Quick Wins** actionnables
- **Design v7 gethooks** (off-black, Libre Baskerville, halos bleus, grain)

### 🚀 Upsell 490€
- **Cal.com** booking intégré
- Audit complet : tracking, CRM, email nurturing, A/B tests, plan 90j chiffré

---

## 🛠️ Stack

- **Next.js 15** (App Router, Turbopack)
- **Tailwind CSS** (design v7)
- **Puppeteer** (screenshots desktop + mobile)
- **Gemini 2.0 Flash** (analyse IA gratuite)
- **Cal.com** (upsell booking)

---

## 📦 Installation

```bash
# Clone
git clone <repo>
cd work/landing-roast

# Install deps
npm install

# Config env
cp .env.example .env.local
# Ajoute ta clé Gemini (gratuit sur aistudio.google.com/apikey)
# Ajoute ton lien Cal.com

# Run dev
npm run dev
# → http://localhost:3000
```

---

## 🔧 Config

### `.env.local`

```bash
# Gemini API (gratuit aistudio.google.com/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Cal.com (upsell audit 490€)
NEXT_PUBLIC_CALCOM_LINK=https://cal.com/linkleads/audit-landing-page
```

---

## 🚀 Deploy Vercel

```bash
# Push repo GitHub
git remote add origin <url>
git push -u origin main

# Import sur Vercel
# → Settings → Environment Variables
# → Ajoute GEMINI_API_KEY + NEXT_PUBLIC_CALCOM_LINK
# → Deploy
```

**Puppeteer sur Vercel** : fonctionne nativement (Chromium bundled).

---

## 📊 Pricing Strategy

- **Gratuit** : analyse complète /100 + top 3 quick wins
- **Upsell 490€** : audit complet système + funnel + plan 90j
  - Call Cal.com (45min)
  - Livrables : doc Notion + roadmap chiffrée + support 30j

**Lead magnet** : outil gratuit → nurture email → upsell audit.

---

## 🎨 Design

**v7 gethooks** :
- Off-black (#1a1a2e) / off-white (#f0f0f0)
- Bleu outremer #1c00fe (usage secondaire : liens, focus, accents)
- CTA primaires blanc cassé (#d9d9d9) / texte quasi-noir (#0a0a0a)
- Libre Baskerville (h1/h2), Geist (corps)
- Halos bleus animés + particules + grain marqué
- Cartes coins arrondis 12-16px
- Spotlight cards (cursor-following glow)

---

## 🧪 Roadmap MVP → V1

### ✅ MVP (fait)
- [x] Analyse IA /100 + quick wins
- [x] Screenshot desktop + mobile
- [x] Design v7
- [x] Upsell Cal.com 490€

### 🔜 V1 (optionnel)
- [ ] **Share link** (DB + /share/[id])
- [ ] **Email rapport** (Resend)
- [ ] **Comparaison concurrents** (upload 2-3 URLs)
- [ ] **Export PDF** (jsPDF)
- [ ] **Historique analyses** (user account)

---

## 📈 SEO & Distribution

- **SEO** : "landing page analyzer", "landing page roast", "conversion rate optimizer"
- **Distribution** :
  - Post LinkedIn (analyse gratuite ta LP)
  - Reddit r/marketing r/startups (outil gratuit)
  - Product Hunt launch
  - Twitter thread (exemples avant/après)

---

## 💰 Business Model

**Lead gen tool** pour Linkleads :
1. Gratuit → collecte email (optionnel)
2. Nurture email (5 mails : best practices LP B2B)
3. Upsell audit 490€ (call Cal.com)

**Objectif** : 10 analyses/semaine → 1-2 audits/mois (500-1000€ MRR).

---

## 🔒 Limites Techniques

- **Gemini 2.0 Flash gratuit** : ~15 appels/min (RPM), quota se reconstitue en quelques min
- **Puppeteer Vercel** : timeout 60s max (Next.js Edge), suffit pour LP standard
- **Screenshot taille** : data URL inline (pas de CDN), OK pour MVP (<2MB)

---

## 📝 Notes Dev

- **Gemini prompt** : scoring STRICT (moyenne = 40-60, excellent = 75+)
- **JSON parsing** : tolérant aux markdown fences (```json ... ```)
- **Mobile screenshot** : 375x667 (iPhone SE), reload page pour trigger responsive
- **Design classes** : spotlight-card, aurora, bounce-dot, footer-wordmark (globals.css)

---

## 🎯 Idées Améliorations

1. **Heatmap clics** (simulation CTA attention)
2. **A/B test suggestions** (variantes headline/CTA auto-générées)
3. **Score compétiteurs** (moyenne industrie SaaS/Services)
4. **Checklist pré-audit** (formulaire brief avant call 490€)
5. **Mode "site entier"** (analyse 5 pages clés)

---

## 🏆 USP vs Concurrence

- **Gratuit** (vs outils payants type Unbounce, Instapage)
- **IA sévère** (scoring honnête, pas de "95/100" automatique)
- **Focus paid** (LinkedIn Ads, Google Ads, pas SEO)
- **Quick wins actionnables** (pas juste "améliore ton CTA")
- **Upsell humain** (audit call, pas SaaS récurrent)

---

**Built by Syrian · Linkleads**
Design v7 gethooks · Powered by Gemini 2.0 Flash
