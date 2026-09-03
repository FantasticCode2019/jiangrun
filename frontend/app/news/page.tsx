'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import Link from 'next/link'
import { api } from '@/lib/api'

type NewsItem = { id: number; title: string; date: string; summary: string }

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getNews({ page: '1', size: '50' })
      .then((data: any) => {
        const list = data?.list || []
        setNews(
          list.map((n: any) => ({
            id: n.id,
            title: n.title,
            date: n.created_at || '',
            summary: n.summary,
          })),
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Header />
      <main>
        <PageHero title="公司动态" kicker="LATEST NEWS" />

        <section className="py-20 bg-cream">
          <div className="max-w-4xl mx-auto px-6">
            {loading ? (
              <p className="text-center text-ink-light py-20">加载中...</p>
            ) : news.length === 0 ? (
              <p className="text-center text-ink-light py-20">暂无新闻</p>
            ) : (
              <div className="space-y-6">
                {news.map((item, index) => (
                  <Reveal key={item.id} delay={index * 80}>
                    <Link
                      href={`/news/${item.id}`}
                      className="group block bg-white p-8 border border-transparent hover:border-accent/40 transition-all duration-300 shadow-sm hover:shadow-xl"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-serif text-2xl font-bold" style={{ color: 'var(--accent)', opacity: 0.6 }}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="h-4 w-px bg-accent/40" />
                        <span className="text-ink-light text-sm tracking-wider">{item.date}</span>
                      </div>
                      <h2 className="font-serif text-xl text-primary font-semibold mb-3 group-hover:text-accent transition-colors">
                        {item.title}
                      </h2>
                      <p className="text-ink-light leading-relaxed">{item.summary}</p>
                      <div className="mt-5 text-accent text-sm tracking-wider opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                        阅读全文
                        <span className="w-5 h-px bg-accent" />
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}