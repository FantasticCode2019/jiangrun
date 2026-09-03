'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import Link from 'next/link'
import { api } from '@/lib/api'

const styles = [
  { key: 'all', label: '全部' },
  { key: 'modern', label: '现代风格' },
  { key: 'chinese', label: '中式风格' },
  { key: 'japanese', label: '日式风格' },
  { key: 'european', label: '欧式风格' },
]

type CaseItem = { id: number; title: string; style: string; location: string; area: string; cover_image: string }

export default function CasesPage() {
  const [cases, setCases] = useState<CaseItem[]>([])
  const [activeStyle, setActiveStyle] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getCases({ page: '1', size: '50' })
      .then((data: any) => {
        const list = data?.list || []
        setCases(
          list.map((c: any) => ({
            id: c.id,
            title: c.title,
            style: c.style,
            location: c.location,
            area: c.area,
            cover_image: c.cover_image,
          })),
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = activeStyle === 'all' ? cases : cases.filter((c) => c.style === activeStyle)

  return (
    <>
      <Header />
      <main>
        <PageHero title="设计案例" kicker="DESIGN CASES" />

        <section className="py-20 bg-cream">
          <div className="container-classic">
            {/* Style Filter */}
            <div className="flex justify-center gap-3 mb-12 flex-wrap">
              {styles.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveStyle(s.key)}
                  className={`px-6 py-2.5 text-sm tracking-wide transition-all duration-300 ${
                    activeStyle === s.key
                      ? 'bg-primary text-white'
                      : 'text-ink-light hover:text-primary border border-transparent hover:border-accent/40'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            {loading ? (
              <p className="text-center text-ink-light py-20">加载中...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-ink-light py-20">暂无案例</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filtered.map((item, index) => (
                  <Reveal key={item.id} delay={index * 80}>
                    <Link href={`/cases/${item.id}`} className="case-card block aspect-[4/3] bg-cream-dark">
                      <img src={item.cover_image} alt={item.title} className="w-full h-full object-cover" />
                      <div className="frame" />
                      <div className="overlay">
                        <div className="w-full">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-1 h-4 bg-accent" />
                            <span className="text-white/65 text-xs tracking-wider">{item.location}{item.area ? ` · ${item.area}` : ''}</span>
                          </div>
                          <div className="text-white font-serif text-lg">{item.title}</div>
                        </div>
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