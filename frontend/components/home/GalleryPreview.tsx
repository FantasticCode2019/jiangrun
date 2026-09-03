'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Reveal from '@/components/ui/Reveal'
import { api } from '@/lib/api'

type Pick = { id: number; title: string; image: string }

/** 首页底部：精选工程实景廊（后端驱动；无案例时自动隐藏） */
export default function GalleryPreview() {
  const [items, setItems] = useState<Pick[]>([])

  useEffect(() => {
    let active = true
    api
      .getFeaturedCases(8)
      .then((data: any) => {
        const list = data?.list || data || []
        const mapped = list
          .map((c: any) => ({
            id: c.id,
            title: c.title || '',
            image: c.cover_image || (c.images && c.images[0]) || '',
          }))
          .filter((x: Pick) => x.image)
        if (active) setItems(mapped)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  if (items.length === 0) return null

  const first = items[0]
  const rest = items.slice(1)

  return (
    <section className="py-24 bg-white">
      <div className="container-classic">
        <div className="text-center mb-14">
          <div className="section-kicker">PORTFOLIO</div>
          <h2 className="section-title">工程实景赏析</h2>
          <div className="gold-line" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Reveal className="lg:col-span-1">
            <div className="img-card block h-full min-h-[300px] group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={first.image} alt={first.title} className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/70 to-transparent text-white font-medium">
                {first.title}
              </div>
            </div>
          </Reveal>
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {rest.slice(0, 8).map((item, i) => (
              <Reveal key={item.id} delay={i * 60}>
                <div className="img-card block aspect-square group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
                    {item.title}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <Link href="/villa" className="btn-classic">
            浏览全部案例
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}