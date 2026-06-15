// app/api/drafts/route.js
// 单独生成回复草稿,供草稿页「换一批」使用。调用 Kimi(Moonshot,国内站)。

import { checkRate } from "../_ratelimit";

export const runtime = "edge";

export async function POST(req) {
  const limited = checkRate(req);
  if (limited) return limited;

  try {
    const { incoming, avoid } = await req.json();
    if (!incoming || !incoming.trim()) {
      return Response.json({ error: "消息为空" }, { status: 400 });
    }

    const avoidNote = avoid
      ? `\n注意:请给出和下面这些不同措辞、不同切入点的新草稿,不要重复:\n${avoid}`
      : "";

    const system = "你是一个温和、专业的沟通顾问,帮助成年人更得体地回应家人的消息。你只输出合法 JSON。";

    const prompt = `针对下面这条父母发来的微信消息,给出三版自然、得体、可直接参考的回复草稿。

父母的消息:
"""
${incoming}
"""
${avoidNote}

请只返回 JSON,不要任何前后缀、不要 markdown 代码块:
{
  "drafts": [
    {"tone": "温和有边界", "text": "既体贴又能温和表达自己想法的回复"},
    {"tone": "简短得体", "text": "简短、礼貌、轻松的回复"},
    {"tone": "温情回应", "text": "带点温度、回应父母关心的回复"}
  ]
}
草稿要自然口语,像真人发微信,不要书面腔。

重要:整个返回必须是合法 JSON,所有结构符号用半角英文符号,不要用全角中文标点,不要输出 JSON 以外的任何文字。`;

    const res = await fetch("https://api.moonshot.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.MOONSHOT_API_KEY}`,
      },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        max_tokens: 800,
        temperature: 0.9,
        response_format: { type: "json_object" },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const msg = data?.error?.message || `上游错误(${res.status})`;
      return Response.json({ error: msg }, { status: 502 });
    }

    const text = data.choices?.[0]?.message?.content?.trim() || "";
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: e.message || "服务器出错" }, { status: 500 });
  }
}
