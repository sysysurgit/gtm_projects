import { gemini } from "./client";

// Gemini reste utilisé pour un seul usage désormais : décrire en texte le
// visuel optionnel joint au brief, parce que l'API DeepSeek (v4-flash /
// v4-pro) n'accepte pas d'image en entrée (schéma de contenu = string
// uniquement — voir doc officielle api-docs.deepseek.com/api/create-chat-completion).
// Cette description texte est ensuite injectée dans le prompt DeepSeek —
// voir lib/deepseek/generate-hooks.ts. gemini-3.1-flash-lite reste gratuit
// et largement suffisant pour une description factuelle courte.
//
// Best-effort : en cas d'échec (quota Gemini, image illisible...), retourne
// undefined plutôt que de faire échouer toute la génération — le visuel est
// optionnel, sa description doit l'être aussi.
export async function describeVisual(base64: string, mediaType: string): Promise<string | undefined> {
  try {
    const response = await gemini.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64, mimeType: mediaType } },
            {
              text: "Décris ce visuel publicitaire en 2-3 phrases factuelles en français : ce qui est montré concrètement, le style visuel, le texte visible s'il y en a, l'ambiance générale. Sois concret et utile pour un copywriter qui doit écrire un hook cohérent avec ce visuel — pas d'interprétation artistique, juste les faits utiles.",
            },
          ],
        },
      ],
      config: { maxOutputTokens: 300 },
    });
    return response.text?.trim() || undefined;
  } catch (err) {
    console.error("describeVisual: Gemini call failed, poursuite sans description visuelle", err);
    return undefined;
  }
}
