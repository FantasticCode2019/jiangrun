'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import Link from 'next/link'
import { api } from '@/lib/api'

type VideoItem = { id: number; title: string; cover_image: string; duration: number; view_count: number }

function formatDuration(seconds: number) {
  if (!seconds) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatViews(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getVideos({ page: '1', size: '50' })
      .then((data: any) => {
        const list = data?.list || []
        setVideos(
          list.map((v: any) => ({
            id: v.id,
            title: v.title,
            cover_image: v.cover_image,
            duration: v.duration,
            view_count: v.view_count,
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
        <PageHero title="园林视频" kicker="GARDEN VIDEOS" />

        <section className="py-20 bg-cream">
          <div className="container-classic">
            {loading ? (
              <p className="text-center text-ink-light py-20">加载中...</p>
            ) : videos.length === 0 ? (
              <p className="text-center text-ink-light py-20">暂无视频</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {videos.map((video, index) => (
                  <Reveal key={video.id} delay={index * 80}>
                    <Link href={`/videos/${video.id}`} className="case-card block aspect-video bg-cream-dark">
                      <img src={video.cover_image} alt={video.title} className="w-full h-full object-cover" />
                      <div className="frame" />
                      <div className="play-btn" style={{ width: 52, height: 52 }} />
                      <div className="absolute bottom-2 right-2 z-[3] bg-black/60 text-white text-xs px-2 py-1" style={{ letterSpacing: '0.1em' }}>
                        {formatDuration(video.duration)}
                      </div>
                      <div className="overlay">
                        <div className="text-white">{video.title}</div>
                        <div className="text-white/60 text-sm mt-1">{formatViews(video.view_count)}次播放</div>
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