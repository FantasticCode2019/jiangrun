import type { Metadata } from 'next'
import { SettingsProvider } from '@/lib/settings'
import './globals.css'

export const metadata: Metadata = {
  title: '北京江润风景园林景观设计有限公司 - 别墅花园设计 | 屋顶花园设计 | 露台花园设计',
  description: '北京江润风景园林景观设计有限公司是专业从事别墅花园设计及施工维护的企业，业务范围包括：别墅花园设计、屋顶花园设计、露台花园设计、园林苗木培育、庭院景观设计、商业空间绿化等。',
  keywords: '别墅花园设计,屋顶花园设计,露台花园设计,庭院景观设计,园林设计,花园施工',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  )
}