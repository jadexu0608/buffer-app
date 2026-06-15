// app/api/_ratelimit.js
// 轻量内存频率限制:同一 IP 每分钟最多 N 次。
// 注意:edge/serverless 实例内存不共享,这只能挡住明显的滥用,
// 不是严格防护。个人分享、小范围使用足够了。
// 若以后流量大、需要严格限流,可换成 Upstash Redis(Vercel 集成,有免费额度)。

const WINDOW_MS = 60 * 1000; // 1 分钟
const MAX_HITS = 10;         // 每分钟每 IP 最多 10 次

const hits = new Map(); // ip -> [timestamps]

export function checkRate(req) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);

  // 顺手清理过期 IP,避免内存无限增长
  if (hits.size > 500) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  if (arr.length > MAX_HITS) {
    return Response.json(
      { error: "请求有点频繁,休息一下,过一会儿再试。" },
      { status: 429 }
    );
  }
  return null;
}
