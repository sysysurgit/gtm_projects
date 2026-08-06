// Client DeepSeek minimal (fetch direct, API compatible OpenAI Chat
// Completions) — pas besoin du SDK openai pour un seul type d'appel.
// Doc : https://api-docs.deepseek.com/api/create-chat-completion

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

export interface DeepSeekMessage {
  role: "system" | "user";
  content: string;
}

export interface DeepSeekUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

interface DeepSeekChatResponse {
  choices: { message: { content: string }; finish_reason: string }[];
  usage: DeepSeekUsage;
}

export class DeepSeekApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "DeepSeekApiError";
  }
}

export async function deepseekChatCompletion(params: {
  model: string;
  messages: DeepSeekMessage[];
  maxTokens?: number;
  // Thinking mode : plus lent mais meilleure qualité de raisonnement créatif —
  // activé par défaut ici car c'est précisément le point de bascule depuis
  // Gemini flash-lite (vitesse) vers DeepSeek (qualité).
  thinking?: boolean;
  reasoningEffort?: "low" | "high" | "max";
  jsonMode?: boolean;
}): Promise<{ content: string; usage: DeepSeekUsage }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY manquante dans l'environnement.");
  }

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      max_tokens: params.maxTokens ?? 2000,
      thinking: { type: params.thinking === false ? "disabled" : "enabled" },
      ...(params.reasoningEffort ? { reasoning_effort: params.reasoningEffort } : {}),
      response_format: { type: params.jsonMode ? "json_object" : "text" },
      stream: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new DeepSeekApiError(res.status, `DeepSeek API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = (await res.json()) as DeepSeekChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Réponse DeepSeek vide ou invalide.");
  }
  return { content, usage: data.usage };
}
