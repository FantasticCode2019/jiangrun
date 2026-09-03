'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PageHero from '@/components/ui/PageHero'
import { api } from '@/lib/api'

export default function ServiceDetailPage() {
  const { slug } = useParams()
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!slug) return
    api
      .getServiceBySlug(String(slug))
      .then((data: any) => setItem(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <>
      <Header />
      <main>
        <PageHero title="服务项目" kicker="OUR SERVICES" />

        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            {loading ? (
              <p className="text-center text-ink-light py-20">加载中...</p>
            ) : error || !item ? (
              <p className="text-center text-ink-light py-20">服务不存在或已下架</p>
            ) : (
              <article>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl">{item.icon || '🌿'}</span>
                  <h1 className="font-serif text-3xl text-primary font-bold">{item.title}</h1>
                </div>
                <div className="relative h-px w-full mb-8" style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
                {item.cover_image && (
                  <div className="img-card rounded-none mb-8 max-h-[420px]">
                    <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                {item.description && (
                  <p className="text-ink-light leading-relaxed mb-8">{item.description}</p>
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