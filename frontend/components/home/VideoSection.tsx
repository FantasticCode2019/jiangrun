'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

type VideoItem = { id: number; title: string; cover_image: string; video_url: string }

export default function VideoSection() {
  const [video, setVideo] = useState<VideoItem | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .getVideos({ page: '1', size: '50' })
      .then((data: any) => {
        const list = data?.list || []
        const first = list.find((v: any) => v.video_url)
        if (first) {
          setVideo({ id: first.id, title: first.title, cover_image: first.cover_image, video_url: first.video_url })
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
  }, [])

  return (
    <section className="section-space bg-primary relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 80% 15%, rgba(201,169,110,0.14), transparent 45%)' }} />
      <div className="container-classic relative">
        <div className="text-center mb-12">
          <div className="section-kicker">GARDEN VIDEO</div>
          <h2 className="font-serif text-3xl md:text-4xl text-white font-bold">园林视频</h2>
          <div className="gold-line" />
        </div>

        {video && !error ? (
          <div className="max-w-4xl mx-auto">
            <div className="aspect-video bg-black overflow-hidden border border-accent/30">
              <video src={video.video_url} controls poster={video.cover_image || undefined} className="w-full h-full object-contain" />
            </div>
            {video.title && <p className="text-white mt-4 text-center text-lg font-medium">{video.title}</p>}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto text-center text-white/70 border border-white/10 rounded-2xl py-16 px-6 bg-white/[0.03]">
            <div className="mx-auto mb-6 w-16 h-16 rounded-full border border-accent/50 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent ml-1" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            </div>
            <p className="mb-2">视频内容制作中</p>
            <p className="text-sm text-white/50 mb-6">在管理后台「视频管理」上传后，此处将自动展示</p>
            <Link href="/contact" className="btn-classic">联系我们咨询</Link>
          </div>
        )}
      </div>
    </section>
  )
}
