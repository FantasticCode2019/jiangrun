'use client'

import Link from 'next/link'
import Reveal from '@/components/ui/Reveal'

const strengths = [
  { title: '创新设计团队', desc: '提供全套科学、实用的设计方案' },
  { title: '自有工厂生产', desc: '线下制作现场安装，提质增效' },
  { title: '专业匠心技师', desc: '跟踪每个细节，注重工程品质' },
  { title: '赤诚服务之心', desc: '为客户提供忠实尽责的服务' },
]

export default function AboutBrief() {
  return (
    <section className="py-24 bg-cream">
      <div className="container-classic">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div>
            <div className="section-kicker">ABOUT JRLA</div>
            <h2 className="section-title">关于江润</h2>
            <div className="relative h-px w-[220px] my-6" style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
            <p className="text-ink-light leading-loose mb-5">
              北京江润风景园林景观设计有限公司成立于<strong className="text-primary">2005年</strong>，
              已成长为集园林苗木培育、庭院景观设计、别墅花园设计、屋顶花园设计、露台花园设计、
              商业空间绿化等为一体的专业化设计、施工及养护的园林绿化品牌企业。
            </p>
            <p className="text-ink-light leading-loose mb-8">
              我们注重功能设计，功能决定形式。在土地资源稀缺的都市，每一寸土地都值得细细推敲，
              我们为每一处庭院提供最实用、最贴合生活的设计方案。
            </p>
            <Link href="/about" className="btn-classic">
              了解更多
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* 优势亮点 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {strengths.map((s, i) => (
              <Reveal key={s.title} delay={i * 100}>
                <div className="bg-white p-6 border-t-2 border-transparent hover:border-accent transition-colors duration-300">
                  <div className="mt-1 w-2 h-8 mb-3" style={{ background: 'var(--accent)' }} />
                  <h3 className="font-serif text-lg text-primary font-semibold mb-2">{s.title}</h3>
                  <p className="text-ink-light text-sm leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}