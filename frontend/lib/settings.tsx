'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'

type Settings = Record<string, string>

const SettingsContext = createContext<Settings>({})

/**
 * 网站设置全局提供者：在根布局挂载一次，避免 Header / Footer / 各页面
 * 重复请求 /settings 接口，共享同一份设置数据。
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>({})

  useEffect(() => {
    let active = true
    api
      .getSettings()
      .then((data: any) => {
        if (active && data) setSettings(data)
      })
      .catch(() => {
        /* 接口失败时使用默认值兜底 */
      })
    return () => {
      active = false
    }
  }, [])

  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  return useContext(SettingsContext)
}