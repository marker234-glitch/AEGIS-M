export type ProtocolId =
  | "auto"
  | "openai"
  | "openai-responses"
  | "anthropic"
  | "gemini"
  | "azure"
  | "ollama"
  | "cohere";

export type ProtocolInfo = {
  id: Exclude<ProtocolId, "auto">;
  title: string;
  path: string;
  auth: string;
  description: string;
  requiresKey: boolean;
  hint: string;
};

export const PROTOCOLS: ProtocolInfo[] = [
  {
    id: "openai",
    title: "OpenAI Chat Completions",
    path: "/v1/chat/completions",
    auth: "Bearer",
    description: "Groq、DeepSeek、xAI、New API、One API 等兼容层。",
    requiresKey: true,
    hint: "https://relay.example.com/v1",
  },
  {
    id: "openai-responses",
    title: "OpenAI Responses",
    path: "/v1/responses",
    auth: "Bearer",
    description: "新 Responses 工具调用协议，input / output 项。",
    requiresKey: true,
    hint: "https://api.openai.com/v1",
  },
  {
    id: "anthropic",
    title: "Anthropic Messages",
    path: "/v1/messages",
    auth: "x-api-key",
    description: "Claude 原生协议，system 与 tool_use 块。",
    requiresKey: true,
    hint: "https://api.anthropic.com",
  },
  {
    id: "gemini",
    title: "Google Gemini",
    path: "/v1beta/models/{model}:generateContent",
    auth: "x-goog-api-key",
    description: "contents / functionCall，模型名写在路径里。",
    requiresKey: true,
    hint: "https://generativelanguage.googleapis.com/v1beta",
  },
  {
    id: "azure",
    title: "Azure OpenAI",
    path: "/openai/deployments/{model}/chat/completions",
    auth: "api-key",
    description: "部署名即模型，附带 api-version。",
    requiresKey: true,
    hint: "https://{resource}.openai.azure.com",
  },
  {
    id: "ollama",
    title: "Ollama",
    path: "/api/chat",
    auth: "可选",
    description: "本机或反向代理。默认不强制密钥。",
    requiresKey: false,
    hint: "http://127.0.0.1:11434",
  },
  {
    id: "cohere",
    title: "Cohere Chat v2",
    path: "/v2/chat",
    auth: "Bearer",
    description: "Command 系列的消息与工具调用。",
    requiresKey: true,
    hint: "https://api.cohere.com",
  },
];

const ALIASES: Record<string, Exclude<ProtocolId, "auto">> = {
  openai: "openai",
  "openai-chat": "openai",
  "chat-completions": "openai",
  "openai-compatible": "openai",
  "openai-responses": "openai-responses",
  responses: "openai-responses",
  anthropic: "anthropic",
  claude: "anthropic",
  messages: "anthropic",
  gemini: "gemini",
  google: "gemini",
  azure: "azure",
  "azure-openai": "azure",
  ollama: "ollama",
  cohere: "cohere",
};

export function detectProtocol(baseUrl: string): Exclude<ProtocolId, "auto"> {
  try {
    const url = new URL(baseUrl);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/$/, "").toLowerCase();
    if (host.includes("openai.azure.com") || host.includes("cognitiveservices.azure.com") || path.includes("/openai/deployments/")) {
      return "azure";
    }
    if (host.includes("generativelanguage.googleapis.com") || path.includes(":generatecontent") || path.endsWith("/v1beta")) {
      return "gemini";
    }
    if (host.includes("anthropic.com") || path.endsWith("/messages")) return "anthropic";
    if (host.endsWith("cohere.ai") || host.endsWith("cohere.com") || path.endsWith("/v2/chat")) return "cohere";
    if (url.port === "11434" || path.endsWith("/api/chat")) return "ollama";
    if (path.endsWith("/responses")) return "openai-responses";
  } catch {
    /* ignore */
  }
  return "openai";
}

export function resolveProtocol(value: string, baseUrl: string): Exclude<ProtocolId, "auto"> {
  if (!value || value === "auto") return detectProtocol(baseUrl);
  const mapped = ALIASES[value.toLowerCase()];
  if (!mapped) throw new Error(`未知协议 ${value}`);
  return mapped;
}

export function protocolInfo(id: Exclude<ProtocolId, "auto">): ProtocolInfo {
  const found = PROTOCOLS.find((item) => item.id === id);
  if (!found) throw new Error(`未知协议 ${id}`);
  return found;
}
