'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSettings } from '@/lib/settings'
import { api } from '@/lib/api'
import { categoryFromBackend, getCategories, type BackendCategory } from '@/lib/categories'

type NavChild = { label: string; href: string }
type NavItem = { label: string; href: string; en: string; children?: NavChild[] }

const aboutChildren: NavChild[] = [
  { label: '关于我们', href: '/about' },
  { label: '企业招聘', href: '/about' },
  { label: '联系我们', href: '/contact' },
]

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openSub, setOpenSub] = useState<string | null>(null)
  const pathname = usePathname()
  const settings = useSettings()
	const [managedCategories, setManagedCategories] = useState<BackendCategory[] | null>(null)

	useEffect(() => {
		let active = true
		api.getCategories('case')
		  .then((items: BackendCategory[]) => active && setManagedCategories(items || []))
		  .catch(() => active && setManagedCategories(null))
		return () => { active = false }
	}, [])

	const staticNav = useMemo<NavItem[]>(() => {
		const designCategories = managedCategories === null
		  ? getCategories()
		  : managedCategories.map((item) => categoryFromBackend(item, undefined))
		return [
		  { label: '首页', href: '/', en: 'HOME' },
		  { label: '关于江润', href: '/about', en: 'ABOUT', children: aboutChildren },
		  ...designCategories.map((category) => ({
			label: category.title,
			href: `/${category.key}`,
			en: category.en,
			children: category.submenu.map((child) => ({
			  label: child.label,
			  href: `/${category.key}#${child.slug}`,
			})),
		  })),
		  { label: '联系我们', href: '/contact', en: 'CONTACT' },
		]
	}, [managedCategories])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setOpenSub(null)
  }, [pathname])

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  // 部分较长菜单项需要更宽站位（避免两行），含「别墅」「屋顶」这类 6 字菜单
  const cellWidth = (href: string) => (href.includes('villa') || href.includes('rooftop') ? '8.4rem' : '6.5rem')

  return (
    <header className={`glass-nav fixed top-0 left-0 right-0 z-50 ${scrolled ? 'scrolled' : ''}`}>
      <div className="mx-auto max-w-[1480px] px-5 xl:px-8 flex items-center justify-between h-[84px]">
        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/site/logo.png" alt="江润园林" className="h-10 w-auto object-contain" />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden xl:flex items-center justify-center flex-1 px-5">
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
        <a href={`tel:${settings.phone || '13701024192'}`} className="header-phone hidden xl:flex flex-col items-start gap-0.5 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-sm font-medium tracking-[0.03em]">{settings.phone || '13701024192'}</span>
          </div>
          <span className="text-[9px] tracking-[0.24em] text-white/45 ml-6">全国服务热线</span>
        </a>

        {/* Mobile Menu Button */}
        <button
          className={`mobile-menu-toggle xl:hidden ${mobileOpen ? 'is-open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="切换导航菜单"
          aria-expanded={mobileOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="xl:hidden bg-primary-dark/97 backdrop-blur-lg border-t border-white/10 max-h-[80vh] overflow-y-auto">
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
