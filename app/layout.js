// app/layout.js
export const metadata = {
  title: "缓冲 · 父母消息情绪缓冲器",
  description: "把父母的消息先放这里冷却一下。看清它底下是什么,给你几版草稿,让你慢一拍再回。",
  openGraph: {
    title: "缓冲 · 父母消息情绪缓冲器",
    description: "在按下发送之前,多一口呼吸的余地。",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
