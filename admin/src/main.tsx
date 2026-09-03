import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={{
      token: {
        colorPrimary: '#1f5a46',
        colorSuccess: '#3f7c62',
        colorWarning: '#b88b45',
        colorText: '#24332d',
        colorTextSecondary: '#718078',
        colorBorderSecondary: '#e8ede9',
        colorBgLayout: '#f3f6f4',
        borderRadius: 10,
        borderRadiusLG: 14,
        controlHeight: 38,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif",
      },
      components: {
        Button: { primaryShadow: '0 8px 18px rgba(31,90,70,.16)' },
        Table: { headerBg: '#f7f9f8', headerColor: '#526159', rowHoverBg: '#f7faf8' },
        Card: { paddingLG: 22 },
      },
    }}>
	  <BrowserRouter basename="/admin">
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>,
)
