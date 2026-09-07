import { useMemo, useState, type FormEvent } from "react";
import { Shield, LoaderCircle, ChevronDown } from "lucide-react";
import { listModelsFn, runScanFn } from "@/lib/aegis/actions";
import { PROTOCOLS, detectProtocol, type ProtocolId } from "@/lib/aegis/protocols";
import type { ScanReport } from "@/lib/aegis/scanner";

const VERDICT: Record<string, string> = {
  pass: "通过",
  suspicious: "需复核",
  unsafe: "不安全",
  inconclusive: "无法判定",
};

export function AegisConsole() {
  const [protocol, setProtocol] = useState<ProtocolId>("auto");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [timeout, setTimeoutSec] = useState(45);
  const [allowHttp, setAllowHttp] = useState(false);
  const [busy, setBusy] = useState<"idle" | "models" | "scan">("idle");
  const [notice, setNotice] = useState("");
  const [report, setReport] = useState<ScanReport | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const resolved = useMemo(() => (protocol === "auto" && baseUrl ? detectProtocol(baseUrl) : protocol), [protocol, baseUrl]);
  const spec = PROTOCOLS.find((item) => item.id === resolved);
  const needsKey = spec?.requiresKey !== false;

  async function loadModels() {
    setBusy("models");
    setNotice("");
    try {
      const result = await listModelsFn({
        data: { baseUrl, apiKey, model, protocol, timeout, allowInsecureHttp: allowHttp },
      });
      setModels(result.models);
      if (result.models[0] && !model) setModel(result.models[0]);
      setNotice(`已读取 ${result.models.length} 个模型`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "读取模型失败");
    } finally {
      setBusy("idle");
    }
  }

  async function startScan(event: FormEvent) {
    event.preventDefault();
    setBusy("scan");
    setNotice("");
    setReport(null);
    try {
      const next = await runScanFn({
        data: { baseUrl, apiKey, model, protocol, timeout, allowInsecureHttp: allowHttp },
      });
      setReport(next as ScanReport);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "扫描失败");
    } finally {
      setBusy("idle");
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 overflow-x-hidden px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between rounded-radius border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-primary font-bold text-primary-ink">A</span>
          <div>
            <p className="font-semibold tracking-tight">
              AEGIS<span className="text-primary">—M</span>
            </p>
            <p className="font-mono text-[11px] tracking-[0.18em] text-muted">MULTI-PROTOCOL RELAY AUDIT</p>
          </div>
        </div>
        <p className="hidden text-sm text-muted sm:block">密钥不落盘 · 工具调用不执行</p>
      </header>
      <section>
        <p className="mb-3 font-mono text-[11px] tracking-[0.16em] text-muted">SUPPORTED PROTOCOLS</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <button type="button" onClick={() => setProtocol("auto")} className={`rounded-radius border px-3 py-3 text-left ${
            protocol === "auto" ? "border-primary bg-surface-2" : "border-border bg-surface"
          }`}>
            <p className="text-sm font-semibold">自动识别</p>
            <p className="mt-1 font-mono text-[11px] text-muted">按主机与路径推断</p>
          </button>
          {PROTOCOLS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setProtocol(item.id);
                if (!baseUrl) setBaseUrl(item.hint);
              }}
              className={`min-w-0 rounded-radius border px-3 py-3 text-left ${
                protocol === item.id ? "border-primary bg-surface-2" : "border-border bg-surface"
              }`}
            >
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-1 break-all font-mono text-[11px] leading-snug text-muted">{item.path}</p>
            </button>
          ))}
        </div>
        {spec ? (
          <p className="mt-3 text-sm text-muted">
            {spec.description} 鉴权：{spec.auth}。
          </p>
        ) : null}
      </section>
      <form onSubmit={startScan} className="rounded-radius border border-border bg-surface p-5">
        <h1 className="text-xl font-semibold">扫描配置</h1>
        <label className="mt-5 block text-sm font-medium" htmlFor="base-url">中转站地址</label>
        <input id="base-url" required value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-bg px-3 py-2.5 font-mono text-sm" />
        <label className="mt-4 block text-sm font-medium" htmlFor="api-key">API Key{needsKey ? "" : "（可选）"}</label>
        <input id="api-key" type="password" required={needsKey} value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" className="mt-1.5 w-full rounded-xl border border-border bg-bg px-3 py-2.5 font-mono text-sm" />
        <label className="mt-4 block text-sm font-medium" htmlFor="model">模型 ID</label>
        <input id="model" list="model-options" value={model} onChange={(event) => setModel(event.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-bg px-3 py-2.5 font-mono text-sm" />
        <datalist id="model-options">{models.map((item) => <option key={item} value={item} />)}</datalist>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={() => void loadModels()} disabled={busy !== "idle"} className="rounded-full border border-border px-3 py-2 text-sm text-primary">{busy === "models" ? "读取中" : "读取模型"}</button>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allowHttp} onChange={(event) => setAllowHttp(event.target.checked)} />
            允许远程 HTTP
          </label>
        </div>
        <button type="submit" disabled={busy !== "idle"} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-ink">
          {busy === "scan" ? <LoaderCircle className="size-4 animate-spin" /> : <Shield className="size-4" />}
          {busy === "scan" ? "正在按协议发探针…" : "启动完整扫描"}
        </button>
        {notice ? <p className="mt-3 text-sm text-warn">{notice}</p> : null}
        {report ? (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold">{VERDICT[report.summary.verdict] ?? report.summary.verdict}</h2>
            <p className="font-mono text-xs text-muted">{report.target.protocol} · {report.target.base_url} · {report.target.model}</p>
            {report.results.map((result) => (
              <button key={result.probe_id} type="button" className="mt-2 block w-full text-left" onClick={() => setOpenId(openId === result.probe_id ? null : result.probe_id)}>
                <strong>{result.title}</strong> {result.status}
                {openId === result.probe_id ? result.findings.map((finding) => <p key={finding.code}>{finding.title}</p>) : null}
              </button>
            ))}
            <ChevronDown className="size-4 text-muted" />
          </div>
        ) : null}
      </form>
    </div>
  );
}
