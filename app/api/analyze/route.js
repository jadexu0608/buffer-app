// app/api/analyze/route.js
// 后端代理:浏览器调这个接口,这里再带着 API key 去调 Kimi(Moonshot)。
// key 通过环境变量注入,永远不会出现在前端代码里。
// Kimi 用兼容 OpenAI 的接口格式。注意:用国内站 api.moonshot.cn。

import { checkRate } from "../_ratelimit";

export const runtime = "edge";

export async function POST(req) {
  const limited = checkRate(req);
  if (limited) return limited;

  try {
    const { incoming } = await req.json();

    if (!incoming || !incoming.trim()) {
      return Response.json({ error: "消息为空" }, { status: 400 });
    }

    const system = "你是一个温和、专业的沟通顾问,帮助成年人更好地理解和回应家人发来的消息,促进健康的家庭沟通与情绪管理。你只输出合法 JSON。";

    const prompt = `用户收到下面这条来自父母的微信消息,希望更冷静地理解它、并准备一个得体的回复。

父母的消息:
"""
${incoming}
"""

请只返回 JSON,不要任何前后缀、不要 markdown 代码块:
{
  "temperature": "从下列选一个词概括消息语气:平静 / 唠叨 / 焦虑 / 关切 / 急切 / 试探",
  "surface": "这句话字面上在表达什么(一句话,30字以内)",
  "underneath": "父母可能的深层情绪或意图(温和、善意地理解。很多直接的表达底层是关心、焦虑或不擅表达的爱。60字以内)",
  "noNeed": "温和提醒用户:哪些部分可以不必过度放在心上、保持平静(40字以内)",
  "drafts": [
    {"tone": "温和有边界", "text": "既体贴又能温和表达自己想法的回复"},
    {"tone": "简短得体", "text": "简短、礼貌、轻松的回复"},
    {"tone": "温情回应", "text": "带点温度、回应父母关心的回复"}
  ]
}
草稿要自然口语,像真人发微信,不要书面腔。

重要:整个返回必须是合法 JSON,所有结构符号(引号、逗号、冒号、花括号、方括号)都用半角英文符号,不要用全角中文标点。不要输出 JSON 以外的任何文字或代码围栏。`;

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
        max_tokens: 1000,
        temperature: 1.0,
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
