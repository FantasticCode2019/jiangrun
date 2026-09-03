'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PageHero from '@/components/ui/PageHero'
import { api } from '@/lib/api'

function formatViews(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default function VideoDetailPage() {
  const { id } = useParams()
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [counted, setCounted] = useState(false)

  useEffect(() => {
    if (!id) return
    api
      .getVideo(Number(id))
      .then((data: any) => setItem(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  const handlePlay = () => {
    if (!counted) {
      setCounted(true)
      api.incrementView(Number(id)).catch(() => {})
    }
  }

  return (
    <>
      <Header />
      <main>
        <PageHero title="园林视频" kicker="GARDEN VIDEO" />

        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            {loading ? (
              <p className="text-center text-ink-light py-20">加载中...</p>
            ) : error || !item ? (
              <p className="text-center text-ink-light py-20">视频不存在或已下架</p>
            ) : (
              <article>
                <h1 className="font-serif text-3xl md:text-4xl text-primary font-bold mb-4">{item.title}</h1>
                <div className="flex items-center gap-x-5 gap-y-2 text-sm text-ink-light mb-8 flex-wrap">
                  {item.view_count ? (
                    <span className="flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-accent" />{formatViews(item.view_count)} 次播放
                    </span>
                  ) : null}
                  {item.category?.name && (
                    <span className="flex items-center gap-2">
                      <span className="w-1 h-3.5 bg-accent" />{item.category.name}
                    </span>
                  )}
                </div>

                {/* 播放器带金框 */}
                <div className="aspect-video bg-black overflow-hidden mb-10 relative border border-accent/30">
                  <video
                    src={item.video_url}
                    poster={item.cover_image}
                    controls
                    onPlay={handlePlay}
                    className="w-full h-full object-contain"
                  />
                </div>

                {item.description && (
                  <p className="text-ink-light leading-relaxed mb-6">{item.description}</p>
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