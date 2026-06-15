# 缓冲 · 父母消息情绪缓冲器

把父母的消息先放这里冷却一下:降温分析 → 回复草稿 → 延迟提醒。
不替你回复,只帮你看清、给你参考、让你慢一拍。

后端使用 Kimi(Moonshot,国内站,中文友好、价格低、国内直连)。

## 上线步骤

### 1. 准备 Kimi (Moonshot) API key
1. 打开 https://platform.moonshot.cn ,注册/登录(用国内站,不是 .ai 国际站)
2. 「API Key 管理」→ 新建 → 复制保存(只显示一次,sk-... 开头)
3. 在「账户充值」里充一点额度(很便宜,几块钱能用很久)
   建议顺手设个消费上限,防止公开链接被刷。

### 2. 推到 GitHub(已完成)

### 3. 部署到 Vercel(测试阶段)
1. 打开 https://vercel.com,用 GitHub 登录
2. Add New → Project → 导入 buffer-app 仓库
3. 在 Environment Variables 里加一条:
   - Key:   MOONSHOT_API_KEY
   - Value: 你的 sk-... key(国内站的)
4. 点 Deploy,等 1-2 分钟

测试阶段用 vercel.app 域名自己验证功能。
注意:vercel.app 域名在中国大陆通常无法直接访问。

### 4. 面向国内正式上线(备案 + 国内部署)
要让国内用户顺畅访问,需要:
- 一个域名(可在阿里云/腾讯云购买)
- 完成 ICP 备案(实名,约 1-3 周)
- 用国内云服务器部署,或用支持国内访问的平台 + 已备案域名
具体步骤上线前再细化。

## 本地预览(可选)
1. 把 .env.example 复制成 .env.local,填入你的 Kimi key
2. npm install
3. npm run dev → 打开 http://localhost:3000

## 接口
- /api/analyze:降温分析(语气 + 三层解读 + 首版草稿)
- /api/drafts:单独换一批草稿
- 两个接口都带按 IP 频率限制(每分钟 10 次),防刷。

## 架构
- 前端 app/page.js:界面,调用自己的 /api/*
- 后端 app/api/*:代理,带着 key 去调 Kimi(key 永不进前端)
- 提醒存在浏览器 localStorage,关页面不丢
