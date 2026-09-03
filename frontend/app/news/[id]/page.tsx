'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PageHero from '@/components/ui/PageHero'
import { api } from '@/lib/api'

export default function NewsDetailPage() {
  const { id } = useParams()
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .getNewsDetail(Number(id))
      .then((data: any) => setItem(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  const date = (item?.created_at || '').slice(0, 10)

  return (
    <>
      <Header />
      <main>
        <PageHero title="公司动态" kicker="LATEST NEWS" />

        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            {loading ? (
              <p className="text-center text-ink-light py-20">加载中...</p>
            ) : error || !item ? (
              <p className="text-center text-ink-light py-20">内容不存在或已下架</p>
            ) : (
              <article>
                <h1 className="font-serif text-3xl md:text-4xl text-primary font-bold mb-5">{item.title}</h1>
                <div className="flex items-center gap-x-5 text-sm text-ink-light mb-8">
                  <span className="flex items-center gap-2">
                    <span className="w-1 h-3.5 bg-accent" />{date}
                  </span>
                  {item.view_count ? (
                    <span className="flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-accent" />{item.view_count} 次浏览
                    </span>
                  ) : null}
                </div>
                <div className="relative h-px w-full mb-8" style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />

                {item.cover_image && (
                  <div className="img-card rounded-none mb-8 max-h-[420px]">
                    <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}

                {item.summary && (
                  <p className="text-ink-light leading-relaxed mb-6 pl-4 font-medium" style={{ borderLeft: '3px solid var(--accent)' }}>
                    {item.summary}
                  </p>
                )}

                {item.content && (
                  <div className="text-ink-light leading-relaxed" dangerouslySetInnerHTML={{ __html: item.content }} />
                )}
              </article>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}