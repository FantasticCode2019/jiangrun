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
  const [slides, setSlides] = useState<Slide[]>(fallbackSlides)
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    api
      .getBanners('home')
      .then((banners: any[]) => {
        if (banners && banners.length > 0) {
          setSlides(
            banners
              .filter((b: any) => b.image_url)
              .map((b: any) => ({
                image: b.image_url,
                title: b.title || '',
                subtitle: b.subtitle || '',
                link: b.link_url || undefined,
              })),
          )
        }
      })
      .catch(() => {
        /* 接口失败时保留默认轮播 */
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

      {/* Content —— 居中经典排版 */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
        {/* 顶部装饰线 */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="h-px w-16 bg-accent/70" />
          <span className="w-2 h-2 rotate-45 bg-accent" />
          <span className="h-px w-16 bg-accent/70" />
        </div>

        <div className="text-accent tracking-[0.45em] text-sm mb-6 animate-slide-up">
          JIE · JIN · YUAN · LIN
        </div>

        <h1
          className="font-serif text-4xl md:text-6xl lg:text-7xl text-white font-bold leading-tight mb-6 animate-slide-up"
          style={{ letterSpacing: '0.08em', textShadow: '0 4px 30px rgba(0,0,0,0.35)' }}
        >
          {slide.title}
        </h1>

        <p
          className="text-white/85 text-lg md:text-xl mb-12 tracking-[0.2em] animate-slide-up"
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
        >
          {slide.subtitle}
        </p>

        {/* 分隔线 */}
        <div className="w-24 h-px mb-12 animate-fade-in" style={{ background: 'var(--accent)' }} />

        <div className="flex flex-wrap gap-5 justify-center animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <Link href="/villa" className="btn-classic">
            浏览设计案例
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          <Link href="/contact" className="btn-dark">
            在线咨询
          </Link>
        </div>
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex gap-3">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className="h-[3px] rounded-full transition-all duration-500"
            style={{
              width: index === current ? '44px' : '16px',
              background: index === current ? 'var(--accent)' : 'rgba(255,255,255,0.35)',
              boxShadow: index === current ? '0 0 8px rgba(184,148,80,0.6)' : 'none',
            }}
            aria-label={`切换到第 ${index + 1} 屏`}
          />
        ))}
      </div>

      {/* Scroll 提示 */}
      <div className="absolute bottom-10 right-8 z-10 hidden lg:flex flex-col items-center gap-2 text-white/50" style={{ writingMode: 'vertical-rl' }}>
        <span className="text-[10px] tracking-[0.4em]">下滑浏览</span>
        <span className="w-px h-10 bg-gradient-to-b from-white/50 to-transparent" />
      </div>
    </section>
  )
}