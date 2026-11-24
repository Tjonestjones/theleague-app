// Text generation for recaps. Two providers, picked by environment:
//
//   Anthropic:          ANTHROPIC_API_KEY  (optional ANTHROPIC_MODEL)
//   Azure AI Foundry:   AZURE_AI_ENDPOINT + AZURE_AI_KEY + AZURE_AI_DEPLOYMENT
//                       (an OpenAI-compatible chat completions deployment)
//
// RECAP_AI_PROVIDER=anthropic|azure forces one when both are set. With
// neither configured, callers fall back to template text.

export type Provider = "anthropic" | "azure";
type Env = Record<string, string | undefined>;

export interface AiConfig {
  provider: Provider;
  model: string;
}

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";

export function aiConfig(env: Env = process.env): AiConfig | null {
  const forced = env.RECAP_AI_PROVIDER as Provider | undefined;
  const hasAnthropic = !!env.ANTHROPIC_API_KEY;
  const hasAzure = !!(env.AZURE_AI_ENDPOINT && env.AZURE_AI_KEY && env.AZURE_AI_DEPLOYMENT);
  if ((forced === "anthropic" || (!forced && hasAnthropic)) && hasAnthropic) {
    return { provider: "anthropic", model: env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL };
  }
  if ((forced === "azure" || !forced) && hasAzure) {
    return { provider: "azure", model: env.AZURE_AI_DEPLOYMENT! };
  }
  return null;
}

export interface GenerateInput {
  system: string;
  prompt: string;
  maxTokens?: number;
}

export async function generateText(
  input: GenerateInput,
  env: Env = process.env,
  fetchImpl: typeof fetch = fetch,
): Promise<{ text: string; model: string } | null> {
  const cfg = aiConfig(env);
  if (!cfg) return null;
  const maxTokens = input.maxTokens ?? 1200;

  if (cfg.provider === "anthropic") {
    const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: maxTokens,
        system: input.system,
        messages: [{ role: "user", content: input.prompt }],
      }),
      signal: AbortSignal.timeout(90_000),
    });
    if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
    return { text, model: cfg.model };
  }

  // Azure AI Foundry / Azure OpenAI chat completions
  const endpoint = env.AZURE_AI_ENDPOINT!.replace(/\/+$/, "");
  const version = env.AZURE_AI_API_VERSION || "2024-10-21";
  const url = `${endpoint}/openai/deployments/${encodeURIComponent(cfg.model)}/chat/completions?api-version=${version}`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json", "api-key": env.AZURE_AI_KEY! },
    body: JSON.stringify({
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.prompt },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`Azure AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return { text: (data.choices?.[0]?.message?.content ?? "").trim(), model: `azure:${cfg.model}` };
}

export const RECAP_SYSTEM = `You write recaps for a private fantasy football league's history site.
Voice: a sharp, dry sports columnist who knows these people. Specific, a little wry, never mean-spirited, no clichés like "buckle up" or "let's dive in".
Rules:
- Use only the facts provided. Never invent scores, players, injuries, quotes or events.
- Treat every manager evenly; don't build the story around any one person unless the facts do.
- Refer to managers by the names given. Round points to one decimal.
- Write in Markdown: short paragraphs, at most one "##" heading per section, no tables, no emoji.`;
