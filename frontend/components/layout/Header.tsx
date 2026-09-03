'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSettings } from '@/lib/settings'
import { getCategories } from '@/lib/categories'

type NavChild = { label: string; href: string }
type NavItem = { label: string; href: string; en: string; children?: NavChild[] }

const designCategories = getCategories()

const aboutChildren: NavChild[] = [
  { label: '关于我们', href: '/about' },
  { label: '企业招聘', href: '/about' },
  { label: '联系我们', href: '/contact' },
]

const staticNav: NavItem[] = [
  { label: '关于江润', href: '/about', en: 'ABOUT', children: aboutChildren },
  ...designCategories.map((c) => ({
    label: c.title,
    href: `/${c.key}`,
    en: c.en,
    children: c.submenu.map((s) => ({ label: s.label, href: `/${c.key}` })),
  })),
  { label: '联系我们', href: '/contact', en: 'CONTACT' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openSub, setOpenSub] = useState<string | null>(null)
  const pathname = usePathname()
  const settings = useSettings()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setOpenSub(null)
  }, [pathname])

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  // 部分较长菜单项需要更宽站位（避免两行），含「别墅」「屋顶」这类 6 字菜单
  const widerKeys = ['/villa', '/rooftop']
  const cellWidth = (href: string) => (widerKeys.includes(href) ? '9.6rem' : '7.2rem')

  return (
    <header className={`glass-nav fixed top-0 left-0 right-0 z-50 ${scrolled ? 'scrolled' : ''}`}>
      <div className="mx-auto max-w-[1400px] px-6 flex items-center justify-between h-24">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/site/logo.png" alt="江润园林" className="h-11 w-auto object-contain" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center justify-center flex-1 px-4">
          {staticNav.map((item, i) => {
            const active = isActive(item.href)
            const hasChildren = !!(item.children && item.children.length)
            const subOpen = openSub === item.href
            return (
              <div
                key={item.href}
                className={`relative menu-item ${i > 0 ? 'menu-divider' : ''}`}
                onMouseEnter={() => hasChildren && setOpenSub(item.href)}
                onMouseLeave={() => setOpenSub(null)}
              >
                <Link
                  href={item.href}
                  className={`menu-link ${active ? 'is-active' : ''}`}
                  style={{ width: cellWidth(item.href) }}
                >
                  <span className="menu-cn">{item.label}</span>
                  <span className="menu-en">{item.en}</span>
                </Link>

                {hasChildren && subOpen && (
                  <div className="menu-drop" style={{ width: cellWidth(item.href) }}>
                    {(item.children || []).map((child, idx) => (
                      <Link key={idx} href={child.href} onClick={() => setOpenSub(null)} className="menu-drop-item">
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Phone */}
        <div className="hidden lg:flex flex-col items-end gap-0.5 shrink-0" style={{ color: '#f0ddb0' }}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-sm font-medium tracking-[0.03em]">{settings.phone || '13701024192'}</span>
          </div>
          <span className="text-[10px] tracking-[0.3em] text-white/50">全国服务热线</span>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden text-white p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="切换导航菜单"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-primary-dark/97 backdrop-blur-lg border-t border-white/10 max-h-[80vh] overflow-y-auto">
          <nav className="flex flex-col py-2">
            {staticNav.map((item) => {
              const active = isActive(item.href)
              const hasChildren = !!(item.children && item.children.length)
              const expanded = openSub === item.href
              return (
                <div key={item.href} className="border-b border-white/5">
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      className="flex-1 px-6 py-4 flex items-baseline gap-2"
                      style={{ color: active ? '#ffd88a' : 'rgba(255,255,255,0.88)' }}
                    >
                      <span className="text-[15px] tracking-wide">{item.label}</span>
                      <span className="text-[10px] tracking-[0.25em] opacity-45">{item.en}</span>
                    </Link>
                    {hasChildren && (
                      <button
                        onClick={() => setOpenSub(expanded ? null : item.href)}
                        className="px-5 py-4 text-white/60"
                        aria-label="展开子菜单"
                      >
                        <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none"
                          stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {hasChildren && expanded && (
                    <div className="bg-black/25">
                      {(item.children || []).map((child, idx) => (
                        <Link
                          key={idx}
                          href={child.href}
                          className="block px-10 py-3 text-[14px] text-white/80 border-b border-white/5"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            <div className="px-6 py-4 flex items-center gap-2" style={{ color: '#f0ddb0' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-sm">{settings.phone || '13701024192'}</span>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}