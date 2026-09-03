'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Reveal from '@/components/ui/Reveal'
import { getCategory, type Category } from '@/lib/categories'
import { api } from '@/lib/api'

type GalleryCase = { id: number; title: string; image: string; category_id?: number }
type SubGroup = { label: string; slug: string; items: GalleryCase[] }

/**
 * 栏目通用页（后端驱动）：
 * 不再是全部案例混排平铺，而是按「子菜单 / 子模块」分组展示——
 * 每个子模块一个分区，其下的案例排列在该分区下方；一个子模块可含多条案例。
 * 后端无数据时不展示任何内置示例（示例已清空）。
 */
export default function CategoryPage({ categoryKey }: { categoryKey: string }) {
  const category = getCategory(categoryKey) as Category
  const [tree, setTree] = useState<any[]>([])
  const [cases, setCases] = useState<GalleryCase[]>([])

  // 后端分类树：找到当前栏目父分类
  const topCat = useMemo(() => {
    if (!tree.length) return undefined
    return tree.find(
      (t: any) => (t.slug || '').includes(categoryKey) || (t.name || '') === category.title,
    )
  }, [tree, categoryKey, category.title])

  // 拉后端分类树 + 该栏目各子分类下的案例
  useEffect(() => {
    let active = true
    api
      .getCategories('case')
      .then(async (cats: any) => {
        if (!active) return
        setTree(cats || [])
        const top = (cats || []).find(
          (t: any) => (t.slug || '').includes(categoryKey) || (t.name || '') === category.title,
        )
        if (!top) return
        const childCats = top.children || []
        const ids = [top.id].concat(childCats.map((c: any) => c.id))
        const all: any[] = []
        for (const id of ids) {
          try {
            const data: any = await api.getCases({ category_id: String(id), page: '1', size: '200' })
            const list = data?.list || data || []
            all.push(...list.map((x: any) => ({ ...x, _catId: id })))
          } catch {
            /* 子分类拉取失败不影响整体 */
          }
        }
        if (!active) return
        const uniq = Array.from(new Map(all.map((c: any) => [c.id, c])).values())
        setCases(
          uniq.map((c: any) => ({
            id: c.id,
            title: c.title || '',
            image: c.cover_image || (c.images && c.images[0]) || '',
            category_id: c.category_id,
          })),
        )
      })
      .catch(() => {
        /* 后端不可用 */
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryKey])

  // 按子菜单分组：每个子模块一个分区，含其下所有案例
  const groups: SubGroup[] = useMemo(() => {
    if (!topCat?.children?.length) return []
    return topCat.children.map((child: any) => {
      const items = cases.filter((c) => c.category_id === child.id)
      return { label: child.name, slug: child.slug, items }
    })
  }, [topCat, cases])

  const hasAny = cases.length > 0

  if (!category) {
    return (
      <>
        <Header />
        <main className="pt-40 pb-24 text-center text-ink-light">栏目不存在</main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="pt-20">
        {/* 栏目横幅 */}
        <section className="page-hero">
          <div className="relative z-10 text-center px-6 py-14">
            <div className="mx-auto mb-7 flex items-center gap-4 justify-center">
              <span className="h-px w-12 bg-accent/60" />
              <span className="w-2 h-2 rotate-45 bg-accent" />
              <span className="h-px w-12 bg-accent/60" />
            </div>
            <h1 className="font-serif text-4xl md:text-5xl text-white font-bold tracking-[0.08em]">
              {category.title}
            </h1>
            <div className="mt-4 text-accent tracking-[0.5em] text-sm uppercase">{category.en}</div>
            <p className="mt-5 text-white/70 text-sm tracking-[0.2em] max-w-xl mx-auto">{category.subtitle}</p>
            <div className="mt-7 text-xs tracking-widest text-white/50">
              <span>首页</span> <span className="text-accent mx-1.5">›</span>
              <span className="text-white/80">{category.title}</span>
            </div>
          </div>
        </section>

        {/* 简介文字 */}
        <section className="pt-14 pb-10 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <div className="space-y-5 text-ink-light leading-loose text-[15px]">
              {category.intro.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        {/* 案例：按子模块分组展示（不混排） */}
        <section className="pb-20 bg-cream">
          <div className="container-classic">
            {/* 子模块标题行 */}
            <div className="flex items-center gap-3 mb-10 mt-4">
              <span className="inline-block w-1 h-6" style={{ background: 'var(--accent)' }} />
              <h2 className="font-serif text-2xl md:text-3xl text-primary font-bold">工程案例</h2>
            </div>

            {!hasAny ? (
              /* 空态：无任何上传案例 */
              <div className="text-center py-20 border border-dashed border-primary/20">
                <div className="text-5xl mb-4 opacity-40">🖼️</div>
                <p className="text-ink-light mb-2">该栏目下暂无案例</p>
                <p className="text-sm text-ink-light/60">
                  请在管理后台「案例管理」上传，并归类到对应子模块（{category.submenu.map((s) => s.label).join(' / ')}）
                </p>
              </div>
            ) : (
              /* 按子模块逐个分区展示 */
              <div className="space-y-16">
                {groups.map((group) => (
                  <div key={group.slug} id={group.slug}>
                    {/* 子模块标题 */}
                    <div className="flex items-baseline gap-3 mb-7">
                      <h3 className="font-serif text-xl md:text-2xl text-primary font-semibold tracking-wide">
                        {group.label}
                      </h3>
                      {group.items.length > 0 && (
                        <span className="text-xs text-ink-light/70">共 {group.items.length} 条</span>
                      )}
                    </div>

                    {group.items.length === 0 ? (
                      <p className="text-ink-light/60 text-sm pl-1">此子模块暂无案例</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
                        {group.items.map((item, index) => (
                          <Reveal key={item.id} delay={(index % 3) * 80}>
                            <Link href={`/cases/${item.id}`} className="block group">
                              <figure className="case-card">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={item.image} alt={item.title} loading="lazy" className="case-card-img" />
                                <figcaption className="case-card-cap">
                                  <span className="w-2 h-2 rotate-45" style={{ background: 'var(--accent)' }} />
                                  <span className="case-card-title">{item.title}</span>
                                </figcaption>
                              </figure>
                            </Link>
                          </Reveal>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 视频展示 */}
        <section className="py-20 bg-primary relative overflow-hidden">
          <div className="container-classic relative">
            <div className="text-center mb-12">
              <div className="section-kicker">GARDEN VIDEO</div>
              <h2 className="font-serif text-3xl md:text-4xl text-white font-bold tracking-wide">
                {category.title} · 视频
              </h2>
              <div className="gold-line" />
            </div>
            <div className="max-w-2xl mx-auto text-center text-white/70 border border-accent/20 py-14">
              <div className="text-5xl mb-4">🎬</div>
              <p>走进园林实景，感受空间之美（后台「视频管理」上传后此处展示相关视频）</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}