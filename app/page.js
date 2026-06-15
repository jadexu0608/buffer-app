"use client";
import { useState, useEffect, useRef } from "react";

// 「缓冲」—— 父母消息情绪缓冲器(公开部署版)
// 调用自有后端 /api/analyze,API key 安全地留在服务端。
// 提醒用 localStorage 持久化,关页面不丢。

const P = {
  ink: "#2A2D34", paper: "#EDEAE3", card: "#F5F3ED", mist: "#DCD8CF",
  sage: "#7C8A6E", sageDeep: "#5E6B53", clay: "#B08968", faint: "#8A8579", warn: "#9E5A4E",
};

const STORE_KEY = "buffer_reminders_v1";

export default function App() {
  const [tab, setTab] = useState("cool");
  const [incoming, setIncoming] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [drafts, setDrafts] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [hydrated, setHydrated] = useState(false);

  // 启动时从 localStorage 读取提醒
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setReminders(JSON.parse(raw));
    } catch (_) {}
    setHydrated(true);
  }, []);

  // 提醒变化时写回 localStorage
  useEffect(() => {
    if (hydrated) {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(reminders)); } catch (_) {}
    }
  }, [reminders, hydrated]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const dueCount = reminders.filter((r) => r.fireAt <= now).length;

  return (
    <div style={{ display: "flex", justifyContent: "center", minHeight: "100dvh", background: P.paper }}>
      <div
        style={{
          width: "100%", maxWidth: 440, minHeight: "100dvh", background: P.paper,
          fontFamily: "'PingFang SC','Hiragino Sans GB','Microsoft YaHei',system-ui,sans-serif",
          color: P.ink, display: "flex", flexDirection: "column", position: "relative",
        }}
      >
        <div style={{ padding: "20px 22px 10px", flexShrink: 0 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.35em", color: P.sage, fontWeight: 600 }}>缓 冲</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 90px" }}>
          {tab === "cool" && (
            <CoolPage {...{ incoming, setIncoming, analysis, setAnalysis, setDrafts }} goDrafts={() => setTab("drafts")} />
          )}
          {tab === "drafts" && <DraftsPage drafts={drafts} setDrafts={setDrafts} incoming={incoming} goCool={() => setTab("cool")} />}
          {tab === "later" && <LaterPage {...{ incoming, reminders, setReminders, now }} />}
        </div>

        <nav style={{ position: "fixed", bottom: 0, width: "100%", maxWidth: 440, display: "flex", borderTop: `1px solid ${P.mist}`, background: P.card }}>
          <Tab label="降温分析" active={tab === "cool"} onClick={() => setTab("cool")} icon="〜" />
          <Tab label="回复草稿" active={tab === "drafts"} onClick={() => setTab("drafts")} icon="✎" />
          <Tab label="延迟提醒" active={tab === "later"} onClick={() => setTab("later")} icon="◷" badge={dueCount} />
        </nav>
      </div>
    </div>
  );
}

function CoolPage({ incoming, setIncoming, analysis, setAnalysis, setDrafts, goDrafts }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    if (!incoming.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incoming }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "分析没走通,再试一次。");

      const parsed = safeParseJSON(data.text);
      if (!parsed || !Array.isArray(parsed.drafts)) {
        console.error("解析失败,原始返回:", data.text);
        throw new Error("返回格式不对,请重试。");
      }
      setAnalysis({ temperature: parsed.temperature || "—", surface: parsed.surface || "", underneath: parsed.underneath || "", noNeed: parsed.noNeed || "" });
      setDrafts(parsed.drafts);
    } catch (e) {
      console.error(e);
      setError(e.message || "分析没走通,再试一次。");
    } finally {
      setLoading(false);
    }
  }

  const tempColor = (t) => ({ 平静: P.sage, 唠叨: P.clay, 焦虑: P.clay, 关切: P.sage, 急切: "#A86B5B", 试探: P.clay }[t] || P.faint);

  return (
    <div>
      <h1 style={{ fontSize: 18, fontWeight: 600, margin: "2px 0 14px", lineHeight: 1.35, fontFamily: "Georgia,'Songti SC',serif" }}>
        消息先放这里冷却一下
      </h1>
      {!analysis ? (
        <>
          <label style={{ ...lbl, marginBottom: 8 }}>把父母发来的消息粘进来</label>
          <textarea value={incoming} onChange={(e) => { setIncoming(e.target.value); setError(""); }}
            placeholder="比如:你看看人家谁谁谁都结婚了,你整天忙什么…" rows={5} style={ta} />
          {error && <div style={{ color: P.warn, fontSize: 13, marginTop: 8 }}>{error}</div>}
          <button onClick={analyze} disabled={loading || !incoming.trim()} style={btn(loading || !incoming.trim())}>
            {loading ? "正在降温…" : "降温分析"}
          </button>
          <p style={{ color: P.faint, fontSize: 12, lineHeight: 1.7, marginTop: 14 }}>不替你回复。先看清这条消息底下是什么。</p>
        </>
      ) : (
        <>
          <button onClick={() => setAnalysis(null)}
            style={{ width: "100%", textAlign: "left", background: P.card, border: `1px solid ${P.mist}`, borderRadius: 9, padding: "9px 12px", fontSize: 12, color: P.faint, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
              {incoming.slice(0, 22) + (incoming.length > 22 ? "…" : "")}
            </span>
            <span style={{ color: P.sage, flexShrink: 0 }}>换一条 ↺</span>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: P.faint }}>这条消息的温度</span>
            <span style={{ background: tempColor(analysis.temperature), color: P.paper, fontSize: 12, padding: "3px 12px", borderRadius: 20, fontWeight: 600 }}>{analysis.temperature}</span>
          </div>
          <BlkTight label="表面上在说">{analysis.surface}</BlkTight>
          <BlkTight label="底下可能是" accent>{analysis.underneath}</BlkTight>
          <BlkTight label="不必被它带走的">{analysis.noNeed}</BlkTight>
          <button onClick={goDrafts} style={{ ...btn(false), background: P.clay, marginTop: 4 }}>看看回复草稿 →</button>
        </>
      )}
    </div>
  );
}

function DraftsPage({ drafts, setDrafts, incoming, goCool }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasMsg = !!incoming.trim();

  async function regenerate() {
    if (!hasMsg) return;
    setLoading(true); setError("");
    try {
      const avoid = (drafts || []).map((d) => d.text).join("\n");
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incoming, avoid }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "换草稿没走通,再试一次。");
      const parsed = safeParseJSON(data.text);
      if (!parsed || !Array.isArray(parsed.drafts)) throw new Error("返回格式不对,请重试。");
      setDrafts(parsed.drafts);
    } catch (e) {
      console.error(e);
      setError(e.message || "换草稿没走通,再试一次。");
    } finally {
      setLoading(false);
    }
  }

  if (!drafts) {
    return (
      <div>
        <h1 style={h1s}>回复草稿</h1>
        <p style={subs}>挑一版,改成你自己的话,再发出去。</p>
        <Empty>
          {hasMsg ? "先在「降温分析」里跑一下,这里就会出现草稿。" : "还没有消息。去「降温分析」粘一条父母的消息开始。"}
          <button onClick={goCool} style={{ ...btn(false), marginTop: 16 }}>去降温分析</button>
        </Empty>
      </div>
    );
  }
  return (
    <div>
      <h1 style={h1s}>回复草稿</h1>
      <p style={subs}>三版不同的卷入度。挑一个,改成你的话再发。</p>
      {drafts.map((d, i) => <DraftCard key={i} draft={d} />)}
      {error && <div style={{ color: P.warn, fontSize: 13, marginTop: 12 }}>{error}</div>}
      <button onClick={regenerate} disabled={loading || !hasMsg}
        style={{ ...chip(P.sageDeep), width: "100%", padding: "11px", marginTop: 16, opacity: loading || !hasMsg ? 0.5 : 1 }}>
        {loading ? "换一批中…" : "换一批草稿 ↻"}
      </button>
      <p style={{ fontSize: 12, color: P.faint, lineHeight: 1.7, marginTop: 16 }}>发什么、怎么改、什么时候发,都还是你说了算。</p>
    </div>
  );
}

function DraftCard({ draft }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ background: P.card, border: `1px solid ${P.mist}`, borderRadius: 12, padding: 16, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: P.sage, fontWeight: 600 }}>{draft.tone}</span>
        <button onClick={() => { navigator.clipboard?.writeText(draft.text); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={chip(P.sageDeep)}>
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.7 }}>{draft.text}</div>
    </div>
  );
}

function LaterPage({ incoming, reminders, setReminders, now }) {
  const due = reminders.filter((r) => r.fireAt <= now);
  const pending = reminders.filter((r) => r.fireAt > now);
  function add(min, t) {
    const label = incoming.trim() ? incoming.slice(0, 18) + (incoming.length > 18 ? "…" : "") : "回复父母";
    setReminders((p) => [...p, { id: Date.now() + Math.random(), label, fireAt: Date.now() + min * 60000, when: t }]);
  }
  function remove(id) { setReminders((p) => p.filter((r) => r.id !== id)); }
  const fmt = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  return (
    <div>
      <h1 style={h1s}>不想现在回?</h1>
      <p style={subs}>设个提醒,等情绪平了再说。让自己慢一拍。</p>
      <label style={lbl}>{incoming.trim() ? "为当前这条消息设提醒" : "设一个回复提醒"}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {[{ m: 30, t: "半小时后" }, { m: 120, t: "2 小时后" }, { m: 480, t: "今晚" }, { m: 1440, t: "明天" }].map((o) => (
          <button key={o.m} onClick={() => add(o.m, o.t)} style={chip(P.sageDeep)}>{o.t}</button>
        ))}
      </div>
      {due.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <label style={lbl}>到点了</label>
          {due.map((r) => (
            <div key={r.id} style={{ background: P.sageDeep, color: P.paper, borderRadius: 12, padding: "13px 16px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 10 }}>该回复了:{r.label}</span>
              <button onClick={() => remove(r.id)} style={{ ...chip(P.paper), flexShrink: 0 }}>知道了</button>
            </div>
          ))}
        </div>
      )}
      {pending.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <label style={lbl}>冷却中</label>
          {pending.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, padding: "11px 0", borderBottom: `1px solid ${P.mist}` }}>
              <div style={{ overflow: "hidden", marginRight: 10 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.label}</div>
                <div style={{ fontSize: 11, color: P.faint }}>{r.when}</div>
              </div>
              <span style={{ fontVariantNumeric: "tabular-nums", color: P.sage, fontWeight: 600, flexShrink: 0 }}>{fmt(r.fireAt - now)}</span>
            </div>
          ))}
        </div>
      )}
      {reminders.length === 0 && <Empty>还没有提醒。选个时间,给自己留出冷却的空当。</Empty>}
    </div>
  );
}

function Tab({ label, active, onClick, icon, badge }) {
  return (
    <button onClick={onClick} style={{ flex: 1, background: "none", border: "none", padding: "10px 0 14px", cursor: "pointer", position: "relative", color: active ? P.sageDeep : P.faint }}>
      <div style={{ fontSize: 18, lineHeight: 1.2 }}>{icon}</div>
      <div style={{ fontSize: 11, fontWeight: active ? 600 : 400, marginTop: 2 }}>{label}</div>
      {badge > 0 && <span style={{ position: "absolute", top: 6, right: "calc(50% - 26px)", background: P.warn, color: P.paper, fontSize: 10, minWidth: 16, height: 16, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", boxSizing: "border-box" }}>{badge}</span>}
    </button>
  );
}

function safeParseJSON(raw) {
  if (!raw) return null;
  let t = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try { return JSON.parse(t); } catch (_) {}
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s !== -1 && e !== -1 && e > s) {
    let body = t.slice(s, e + 1);
    try { return JSON.parse(body); } catch (_) {}
    const fixed = body.replace(/[“”]/g, '"').replace(/，/g, ",").replace(/：/g, ":").replace(/［/g, "[").replace(/］/g, "]").replace(/｛/g, "{").replace(/｝/g, "}");
    try { return JSON.parse(fixed); } catch (_) {}
  }
  return null;
}

const Empty = ({ children }) => <div style={{ textAlign: "center", color: P.faint, fontSize: 14, lineHeight: 1.8, padding: "40px 10px", display: "flex", flexDirection: "column", alignItems: "center" }}>{children}</div>;
const BlkTight = ({ label, children, accent }) => (
  <div style={{ marginBottom: 11 }}>
    <div style={{ fontSize: 10.5, color: P.faint, marginBottom: 2, letterSpacing: "0.05em" }}>{label}</div>
    <div style={{ fontSize: 13.5, lineHeight: 1.6, color: accent ? P.sageDeep : P.ink, fontWeight: accent ? 500 : 400 }}>{children}</div>
  </div>
);
const h1s = { fontSize: 18, fontWeight: 600, margin: "2px 0 6px", lineHeight: 1.35, fontFamily: "Georgia,'Songti SC',serif" };
const subs = { color: P.faint, fontSize: 13, lineHeight: 1.7, margin: "0 0 20px" };
const lbl = { display: "block", fontSize: 13, fontWeight: 600, color: P.ink, marginBottom: 10 };
const ta = { width: "100%", boxSizing: "border-box", border: `1px solid ${P.mist}`, borderRadius: 10, padding: 13, fontSize: 15, lineHeight: 1.6, resize: "vertical", background: P.card, color: P.ink, fontFamily: "inherit", outline: "none" };
const btn = (disabled) => ({ width: "100%", background: disabled ? P.mist : P.sageDeep, color: disabled ? P.faint : P.paper, border: "none", borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 600, cursor: disabled ? "default" : "pointer", marginTop: 14 });
const chip = (c) => ({ background: "transparent", color: c, border: `1px solid ${c}`, borderRadius: 20, padding: "6px 15px", fontSize: 13, fontWeight: 600, cursor: "pointer" });
