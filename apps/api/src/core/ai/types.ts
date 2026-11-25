export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionInput {
  model?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionOutput {
  provider: string;
  model: string;
  content: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

export interface AIProvider {
  readonly id: string;
  complete(input: ChatCompletionInput): Promise<ChatCompletionOutput>;
}

export interface OpenAICompatibleConfig {
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  timeoutMs?: number;
}
