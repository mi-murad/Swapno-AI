import { describe, expect, it, vi } from "vitest";
import { createOpenAICompatibleProvider } from "./openai-compatible.js";

const config = { baseUrl: "http://127.0.0.1:20128/v1", apiKey: "test-key", defaultModel: "test/model" };

describe("OpenAI-compatible AI provider", () => {
  it("sends chat completions to the configured gateway and returns normalized usage", async () => {
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => new Response(JSON.stringify({
      model: "test/model", choices: [{ message: { content: "Hello" } }],
      usage: { prompt_tokens: 4, completion_tokens: 2, total_tokens: 6 },
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const provider = createOpenAICompatibleProvider(config, fetcher as typeof fetch);
    const result = await provider.complete({ messages: [{ role: "user", content: "Hi" }] });
    expect(fetcher).toHaveBeenCalledOnce();
    const firstCall = fetcher.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(String(firstCall?.[0])).toBe("http://127.0.0.1:20128/v1/chat/completions");
    expect(JSON.parse(String(firstCall?.[1]?.body))).toMatchObject({ model: "test/model" });
    expect(result).toMatchObject({ provider: "openai-compatible", content: "Hello", usage: { totalTokens: 6 } });
  });

  it("rejects empty messages and invalid base URLs", async () => {
    const provider = createOpenAICompatibleProvider(config, vi.fn() as unknown as typeof fetch);
    await expect(provider.complete({ messages: [] })).rejects.toThrow(/message/);
    expect(() => createOpenAICompatibleProvider({ ...config, baseUrl: "file:///tmp" })).toThrow(/HTTP/);
  });

  it("does not silently hide provider errors", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ error: { message: "model unavailable" } }), { status: 503 }));
    const provider = createOpenAICompatibleProvider(config, fetcher as typeof fetch);
    await expect(provider.complete({ messages: [{ role: "user", content: "Hi" }] })).rejects.toThrow("model unavailable");
  });
});
