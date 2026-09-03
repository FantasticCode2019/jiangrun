'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import { api } from '@/lib/api'

type Block = {
  type: 'image' | 'video' | 'text'
  src?: string
  caption?: string
  text?: string
  align?: 'left' | 'center'
}

const styleLabel: Record<string, string> = {
  modern: '现代风格',
  chinese: '中式风格',
  japanese: '日式风格',
  european: '欧式风格',
}

export default function CaseDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .getCase(Number(id))
      .then((data: any) => setItem(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  const blocks: Block[] = Array.isArray(item?.blocks) ? item.blocks : []
  // 兼容旧数据：无 blocks 时回退到旧的图片/简介/富文本
  const legacyImages: string[] = Array.isArray(item?.images) ? item.images : []
  const hasBlocks = blocks.length > 0

  return (
    <>
      <Header />
      <main>
        <PageHero title="案例详情" kicker="CASE DETAIL" />

        <section className="py-16 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            {loading ? (
              <p className="text-center text-ink-light py-20">加载中...</p>
            ) : error || !item ? (
              <p className="text-center text-ink-light py-20">案例不存在或已下架</p>
            ) : (
              <article>
                {/* 标题区 */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 text-xs text-ink-light/70 mb-4">
                    <Link href="/" className="hover:text-accent transition-colors">首页</Link>
                    <span className="text-accent">›</span>
                    <span>{item.category?.name || item.title}</span>
                  </div>
                  <h1 className="font-serif text-3xl md:text-4xl text-primary font-bold mb-5">{item.title}</h1>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-light">
                    {item.style && (
                      <span className="flex items-center gap-2">
                        <span className="w-1 h-3.5 bg-accent" />风格：{styleLabel[item.style] || item.style}
                      </span>
                    )}
                    {item.location && (
                      <span className="flex items-center gap-2">
                        <span className="w-1 h-3.5 bg-accent" />地点：{item.location}
                      </span>
                    )}
                    {item.area && (
                      <span className="flex items-center gap-2">
                        <span className="w-1 h-3.5 bg-accent" />面积：{item.area}
                      </span>
                    )}
                  </div>
                  <div className="relative h-px w-full mt-6" style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
                </div>

                {/* 内容块：按顺序渲染 图片/视频/文字 */}
                {hasBlocks ? (
                  <div className="space-y-10">
                    {blocks.map((b, i) => {
                      if (b.type === 'image') {
                        return (
                          <Reveal key={i} delay={40}>
                            <figure className="max-w-3xl mx-auto">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={b.src}
                                alt={b.caption || item.title}
                                className="w-full h-auto object-cover"
                                loading="lazy"
                              />
                              {b.caption && (
                                <figcaption className="mt-3 text-center text-sm text-ink-light/70">{b.caption}</figcaption>
                              )}
                            </figure>
                          </Reveal>
                        )
                      }
                      if (b.type === 'video') {
                        return (
                          <Reveal key={i} delay={40}>
                            <figure className="max-w-3xl mx-auto">
                              <div className="aspect-video bg-black overflow-hidden">
                                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                                <video src={b.src} controls preload="metadata" className="w-full h-full object-contain" />
                              </div>
                              {b.caption && (
                                <figcaption className="mt-3 text-center text-sm text-ink-light/70">{b.caption}</figcaption>
                              )}
                            </figure>
                          </Reveal>
                        )
                      }
                      // text
                      return b.text ? (
                        <div
                          key={i}
                          className="prose-lede max-w-3xl mx-auto"
                          style={{
                            textAlign: b.align === 'center' ? 'center' : 'left',
                          }}
                          dangerouslySetInnerHTML={{ __html: b.text }}
                        />
                      ) : null
                    })}
                  </div>
                ) : (
                  /* 兼容旧数据：封面 + 多图 + 描述 + 富文本 */
                  <div>
                    {item.cover_image && (
                      <div className="max-w-4xl mx-auto mb-10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.cover_image} alt={item.title} className="w-full h-auto object-cover" />
                      </div>
                    )}
                    {item.description && (
                      <p className="text-ink-light leading-relaxed mb-10 max-w-3xl mx-auto">{item.description}</p>
                    )}
                    {legacyImages.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
                        {legacyImages.map((url: string, i: number) => (
                          <div key={i} className="img-card rounded-lg overflow-hidden aspect-[4/3]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={`${item.title}-${i + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    {item.content && (
                      <div className="max-w-3xl mx-auto text-ink-light leading-relaxed" dangerouslySetInnerHTML={{ __html: item.content }} />
                    )}
                  </div>
                )}

                {/* 返回 */}
                <div className="mt-16 pt-8 border-t border-primary/10 text-center">
                  <button onClick={() => router.back()} className="btn-classic inline-flex">
                    返回上一页
                  </button>
                </div>
              </article>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}