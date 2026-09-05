'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

type Slide = { image: string; title: string; subtitle: string; link?: string }

// 后端 banner 无数据时的默认轮播（不内置示例图片，仅展示品牌文案）
const fallbackSlides: Slide[] = [
  {
    image: '',
    title: '专注庭院设计二十年',
    subtitle: '别墅花园 · 屋顶花园 · 假山假水 · 工厂制作',
  },
  {
    image: '',
    title: '经典 · 大气 · 自然',
    subtitle: '以专业设计与匠心施工，为每一寸土地赋予生命力',
  },
  {
    image: '',
    title: '从设计到施工一站服务',
    subtitle: '让诗意栖居，融入每一次归家的步履',
  },
]

export default function HeroBanner() {
  const [slides, setSlides] = useState<Slide[]>([])
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    api
      .getBanners('home')
      .then((banners: any[]) => {
        setSlides(
          (banners || [])
            .filter((b: any) => b.image_url)
            .map((b: any) => ({
              image: b.image_url,
              title: b.title || '',
              subtitle: b.subtitle || '',
              link: b.link_url || undefined,
            })),
        )
      })
      .catch(() => {
		setSlides(fallbackSlides)
      })
  }, [])

  useEffect(() => {
    if (slides.length === 0) return
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [slides.length])

  if (slides.length === 0) return null

  const slide = slides[current]

  return (
    <section className="hero-slide">
      {/* Background Slides */}
      {slides.map((s, index) => (
        <div
          key={index}
          className="absolute inset-0 transition-opacity duration-[1200ms]"
          style={{
            opacity: index === current ? 1 : 0,
            backgroundImage: s.image ? `url(${s.image})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      ))}

      <div className="hero-art" aria-hidden="true">
        <span className="hero-orbit hero-orbit-one" />
        <span className="hero-orbit hero-orbit-two" />
        <span className="hero-mountain hero-mountain-one" />
        <span className="hero-mountain hero-mountain-two" />
      </div>

      {/* Content —— 更现代的左对齐编辑式排版 */}
      <div className="relative z-10 h-full container-classic flex items-center pt-20 pb-32">
        <div className="hero-copy max-w-4xl">
          <div className="hero-eyebrow animate-slide-up">
            <span className="hero-eyebrow-dot" />
            SINCE 2005 · BEIJING
          </div>

          <div className="text-accent/90 tracking-[0.42em] text-xs md:text-sm mb-5 animate-slide-up">
            JIANGRUN LANDSCAPE
          </div>

          <h1 className="hero-title animate-slide-up">{slide.title}</h1>

          <p className="hero-subtitle animate-slide-up">{slide.subtitle}</p>

          <div className="flex flex-wrap gap-4 animate-slide-up" style={{ animationDelay: '0.25s' }}>
            <Link href={slide.link || '/villa'} className="btn-hero-primary">
              浏览设计案例
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 12h14m-5-5 5 5-5 5" />
              </svg>
            </Link>
            <Link href="/contact" className="btn-hero-ghost">预约设计咨询</Link>
          </div>
        </div>
      </div>

      <div className="hero-trust z-10">
        <div><strong>20<sup>+</sup></strong><span>年行业沉淀</span></div>
        <div><strong>设计</strong><span>因地制宜</span></div>
        <div><strong>施工</strong><span>全程把控</span></div>
        <div><strong>养护</strong><span>长期服务</span></div>
      </div>

      {/* Slide Indicators */}
      <div className="hero-dots z-20 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className="h-[2px] rounded-full transition-all duration-500"
            style={{
              width: index === current ? '44px' : '16px',
              background: index === current ? 'var(--accent)' : 'rgba(255,255,255,0.35)',
              boxShadow: index === current ? '0 0 8px rgba(184,148,80,0.6)' : 'none',
            }}
            aria-label={`切换到第 ${index + 1} 屏`}
          />
        ))}
      </div>

    </section>
  )
}
