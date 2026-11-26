import type { AIProvider, ChatCompletionInput, ChatCompletionOutput, OpenAICompatibleConfig } from "./types.js";

type FetchLike = typeof fetch;

interface ProviderResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string };
}

function normalizeBaseUrl(value: string): string {
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("AI_BASE_URL must be an HTTP(S) base URL without credentials, query, or fragment.");
  }
  return parsed.toString().replace(/\/+$/, "");
}

export function createOpenAICompatibleProvider(
  config: OpenAICompatibleConfig,
  fetcher: FetchLike = fetch,
): AIProvider {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  if (!config.apiKey.trim()) throw new Error("AI_API_KEY is required when an AI provider is enabled.");
  if (!config.defaultModel.trim()) throw new Error("AI_DEFAULT_MODEL is required when an AI provider is enabled.");

  return {
    id: "openai-compatible",
    async complete(input: ChatCompletionInput): Promise<ChatCompletionOutput> {
      if (!input.messages.length) throw new Error("At least one chat message is required.");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 45_000);
      try {
        const response = await fetcher(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
          body: JSON.stringify({
            model: input.model ?? config.defaultModel,
            messages: input.messages,
            ...(input.temperature === undefined ? {} : { temperature: input.temperature }),
            ...(input.maxTokens === undefined ? {} : { max_tokens: input.maxTokens }),
          }),
          signal: controller.signal,
        });
        const payload = await response.json() as ProviderResponse;
        if (!response.ok) throw new Error(payload.error?.message ?? `AI provider returned HTTP ${response.status}.`);
        const choice = payload.choices?.[0]?.message?.content;
        const content = typeof choice === "string"
          ? choice
          : Array.isArray(choice) ? choice.map((part) => part.text ?? "").join("") : "";
        if (!content) throw new Error("AI provider returned no text content.");
        return {
          provider: this.id,
          model: payload.model ?? input.model ?? config.defaultModel,
          content,
          ...(payload.usage ? { usage: {
            promptTokens: payload.usage.prompt_tokens,
            completionTokens: payload.usage.completion_tokens,
            totalTokens: payload.usage.total_tokens,
          } } : {}),
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") throw new Error("AI provider request timed out.");
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
