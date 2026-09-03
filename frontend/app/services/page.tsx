'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import Link from 'next/link'
import { api } from '@/lib/api'

const fallbackIcons = ['🏅', '🏗️', '🌿', '⛰️', '🏛️', '🌱']

type Service = { id: number; title: string; slug: string; icon: string; description: string }

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getServices()
      .then((data: any[]) => {
        if (data && data.length > 0) {
          setServices(
            data.map((s: any, i: number) => ({
              id: s.id,
              title: s.title,
              slug: s.slug,
              icon: s.icon || fallbackIcons[i % fallbackIcons.length],
              description: s.description,
            })),
          )
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Header />
      <main>
        <PageHero title="服务项目" kicker="OUR SERVICES" />

        <section className="py-20 bg-white">
          <div className="container-classic">
            {loading ? (
              <p className="text-center text-ink-light py-20">加载中...</p>
            ) : services.length === 0 ? (
              <p className="text-center text-ink-light py-20">暂无服务</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {services.map((service, index) => (
                  <Reveal key={service.id} delay={index * 90}>
                    <Link
                      href={`/services/${service.slug}`}
                      className="service-card group block h-full"
                    >
                      <div className="absolute top-5 right-6 font-serif text-4xl font-bold opacity-[8%] text-primary">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="text-5xl mb-6">{service.icon}</div>
                      <h3 className="font-serif text-xl text-primary font-semibold mb-4 group-hover:text-accent transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-ink-light text-sm leading-relaxed mb-6">{service.description}</p>
                      <div className="flex items-center justify-center gap-2 text-accent text-sm tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                        了解更多
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