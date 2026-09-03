'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCategories } from '@/lib/categories'
import Reveal from '@/components/ui/Reveal'
import { api } from '@/lib/api'

/**
 * 首页栏目概览。卡片背景图从后端拉取该栏目内（含子模块）的首条案例封面；
 * 后端暂无数据时显示金色纹样占位（不展示任何内建示例图片）。
 */
export default function CategoriesOverview() {
  const categories = getCategories()
  const [covers, setCovers] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    Promise.all(
      categories.map(async (cat) => {
        try {
          // 使用当前栏目 key 匹配后端分类名/别名，取该分类（含子）下的首条案例
          const top: any = await api.getCategories('case').catch(() => null)
          const branch = (top || []).find(
            (t: any) => (t.slug || '').includes(cat.key) || (t.name || '') === cat.title,
          )
          if (!branch) return
          const ids = [branch.id].concat((branch.children || []).map((c: any) => c.id))
          for (const id of ids) {
            const data: any = await api.getCases({ category_id: String(id), page: '1', size: '1' })
            const list = data?.list || []
            if (active && list.length) {
              const c = list[0]
              const img = c.cover_image || (c.images && c.images[0])
              if (img) {
                setCovers((prev) => ({ ...prev, [cat.key]: img }))
                return
              }
            }
          }
        } catch {
          /* ignore */
        }
      }),
    )
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="py-24 bg-white">
      <div className="container-classic">
        <div className="text-center mb-14">
          <div className="section-kicker">OUR SERVICES</div>
          <h2 className="section-title">专业 · 专注 · 匠心</h2>
          <div className="gold-line" />
          <p className="text-ink-light max-w-2xl mx-auto leading-relaxed">
            从别墅花园到屋顶花园，从假山假水到工厂制作，江润园林提供全程设计、施工与养护的一体化服务。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
          {categories.map((cat, index) => {
            const cover = covers[cat.key]
            return (
              <Reveal key={cat.key} delay={index * 90}>
                <Link href={`/${cat.key}`} className="service-card group block h-full">
                  <div className="img-card aspect-[16/10] mb-6 overflow-hidden bg-cream-dark relative">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={cat.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl opacity-30">🏛️</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs tracking-[0.25em] uppercase text-accent">{cat.en}</span>
                  <h3 className="font-serif text-xl text-primary font-semibold mt-1 mb-3 group-hover:text-accent transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-ink-light text-sm line-clamp-2 mb-4">{cat.subtitle}</p>
                  <span className="inline-flex items-center gap-2 text-accent text-sm tracking-wider opacity-80 group-hover:opacity-100 transition-opacity">
                    了解详情
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}