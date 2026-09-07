import {
  authHeaders,
  completeUrl,
  decodeBody,
  encodePayload,
  modelsUrl,
  parseModels,
  resolveProtocol,
  type CanonicalPayload,
  type ProtocolId,
} from "./protocols";

export type Finding = {
  severity: string;
  code: string;
  title: string;
  detail: string;
  evidence?: Record<string, string | number | boolean | string[]>;
};

export type ProbeResult = {
  probe_id: string;
  category: string;
  title: string;
  status: "pass" | "fail" | "error";
  latency_ms?: number;
  findings: Finding[];
  error?: string;
};

export type ScanReport = {
  generated_at: string;
  target: { base_url: string; model: string; protocol: string; api_key: string };
  summary: {
    verdict: string;
    risk_score: number;
    highest_severity: string;
    probe_count: number;
    passed: number;
    failed: number;
    errors: number;
    coverage_percent: number;
  };
  results: ProbeResult[];
  limitations: string[];
};

export type ScanInput = {
  baseUrl: string;
  apiKey: string;
  model: string;
  protocol: ProtocolId | string;
  timeout: number;
  allowInsecureHttp: boolean;
  azureApiVersion?: string;
};

export async function listRelayModels(input: ScanInput): Promise<string[]> {
  const protocol = resolveProtocol(input.protocol, input.baseUrl);
  const url = modelsUrl(protocol, input.baseUrl, input.azureApiVersion);
  const { body } = await requestJson(
    url,
    { method: "GET", headers: { Accept: "application/json", ...authHeaders(protocol, input.apiKey || "ollama") } },
    input.timeout * 1000,
  );
  return parseModels(protocol, body);
}

async function requestJson(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<{ body: Record<string, unknown>; latency_ms: number; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: "error" });
    const raw = await response.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error(`中转站返回了非 JSON 数据（HTTP ${response.status}）`);
    }
    if (!response.ok) {
      throw Object.assign(new Error(`HTTP ${response.status}: ${raw.slice(0, 400)}`), { status: response.status });
    }
    return { body, latency_ms: Date.now() - started, status: response.status };
  } finally {
    clearTimeout(timer);
  }
}

export async function runRelayScan(input: ScanInput): Promise<ScanReport> {
  const protocol = resolveProtocol(input.protocol, input.baseUrl);
  const parsed = new URL(input.baseUrl);
  if (parsed.protocol === "http:" && !input.allowInsecureHttp && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("拒绝通过明文 HTTP 发送 API Key；请改用 HTTPS，或仅在授权测试中打开允许远程 HTTP。");
  }
  let model = input.model.trim();
  if (!model) {
    const models = await listRelayModels(input);
    model = models.find((item) => !/(embed|tts|whisper|audio|image|dall-e|rerank)/i.test(item)) ?? models[0] ?? "";
    if (!model) throw new Error("未发现可用于对话的模型，请手动填写模型 ID");
  }
  return {
    generated_at: new Date().toISOString(),
    target: { base_url: `${parsed.protocol}//${parsed.host}${parsed.pathname}`, model, protocol, api_key: "[REDACTED]" },
    summary: {
      verdict: "inconclusive",
      risk_score: 0,
      highest_severity: "info",
      probe_count: 0,
      passed: 0,
      failed: 0,
      errors: 0,
      coverage_percent: 0,
    },
    results: [],
    limitations: [
      "黑盒探针无法证明中转站没有只针对特定用户、时间或内容触发的条件式攻击。",
      "提示词偏离也可能来自模型自身的不确定性。",
      "工具调用仅被解析和检查，从未执行。",
    ],
  };
}
