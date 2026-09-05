'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { categoryFromBackend, type BackendCategory, type Category } from '@/lib/categories'
import Reveal from '@/components/ui/Reveal'
import { api } from '@/lib/api'

/**
 * 首页栏目概览。卡片背景图从后端拉取该栏目内（含子模块）的首条案例封面；
 * 后端暂无数据时显示金色纹样占位（不展示任何内建示例图片）。
 */
export default function CategoriesOverview() {
  // 只展示后台当前启用的顶级案例栏目。
  const [categories, setCategories] = useState<Category[]>([])
  const [covers, setCovers] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    api.getCategories('case').then(async (top: BackendCategory[]) => {
	  if (!active) return
	  const managed = (top || []).map((item) => categoryFromBackend(item))
	  setCategories(managed)
	  await Promise.all(
		(top || []).map(async (branch) => {
        try {
          const ids = [branch.id].concat((branch.children || []).map((c: any) => c.id))
          for (const id of ids) {
            const data: any = await api.getCases({ category_id: String(id), page: '1', size: '1' })
            const list = data?.list || []
            if (active && list.length) {
              const c = list[0]
              const img = c.cover_image || (c.images && c.images[0])
              if (img) {
				setCovers((prev) => ({ ...prev, [branch.slug]: img }))
                return
              }
            }
          }
        } catch {
          /* ignore */
        }
		}),
	  )
	}).catch(() => setCategories([]))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="section-space bg-white">
      <div className="container-classic">
        <div className="section-heading-row">
          <div>
          <div className="section-kicker">OUR SERVICES</div>
          <h2 className="section-title">造一座会呼吸的花园</h2>
          </div>
          <p className="text-ink-light max-w-xl leading-relaxed">
            从别墅花园到屋顶花园，从假山假水到工厂制作，江润园林提供全程设计、施工与养护的一体化服务。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat, index) => {
            const cover = covers[cat.key]
            return (
              <Reveal key={cat.key} delay={index * 90}>
                <Link href={`/${cat.key}`} className="category-card group block h-full">
                  <div className="category-visual">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={cat.title} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="landscape-placeholder">
                        <span>{String(index + 1).padStart(2, '0')}</span>
                      </div>
                    )}
                    <div className="category-shade" />
                    <span className="category-number">0{index + 1}</span>
                  </div>
                  <div className="category-body">
                    <span className="text-[10px] tracking-[0.28em] uppercase text-accent">{cat.en}</span>
                    <div className="flex items-center justify-between gap-3 mt-2">
                      <h3 className="font-serif text-xl text-primary font-semibold group-hover:text-accent transition-colors">{cat.title}</h3>
                      <span className="category-arrow">↗</span>
                    </div>
                    <p className="text-ink-light text-sm line-clamp-2 mt-3">{cat.subtitle}</p>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
