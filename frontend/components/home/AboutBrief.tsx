'use client'

import Link from 'next/link'
import Reveal from '@/components/ui/Reveal'
import { useSettings } from '@/lib/settings'

const strengths = [
  { title: '创新设计团队', desc: '提供全套科学、实用的设计方案' },
  { title: '自有工厂生产', desc: '线下制作现场安装，提质增效' },
  { title: '专业匠心技师', desc: '跟踪每个细节，注重工程品质' },
  { title: '赤诚服务之心', desc: '为客户提供忠实尽责的服务' },
]

export default function AboutBrief() {
	const settings = useSettings()
	const paragraphs = (settings.home_about_text || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
	const content = paragraphs.length ? paragraphs : [
	  '北京江润风景园林景观设计有限公司成立于2005年，已成长为集园林苗木培育、庭院景观设计、别墅花园设计、屋顶花园设计、露台花园设计、商业空间绿化等为一体的专业化设计、施工及养护的园林绿化品牌企业。',
	  '我们注重功能设计，功能决定形式。在土地资源稀缺的都市，每一寸土地都值得细细推敲，我们为每一处庭院提供最实用、最贴合生活的设计方案。',
	]
  return (
    <section className="section-space bg-cream relative overflow-hidden">
      <div className="section-watermark" aria-hidden="true">江润</div>
      <div className="container-classic">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-14 lg:gap-24 items-start">
          {/* Left */}
          <div>
            <div className="section-kicker">ABOUT JIANGRUN</div>
			<h2 className="section-title whitespace-pre-line">{settings.home_about_title || '用设计，让自然回到日常生活'}</h2>
            <div className="title-rule" />
			{content.map((paragraph, index) => (
			  <p key={index} className={`text-ink-light leading-loose ${index === content.length - 1 ? 'mb-8' : 'mb-5'}`}>
				{paragraph}
			  </p>
			))}
            <Link href="/about" className="text-link">
              了解更多
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* 优势亮点 */}
          <div>
            <div className="about-quote">
              <span className="text-accent text-xs tracking-[0.3em]">OUR PHILOSOPHY</span>
              <blockquote>“功能决定形式，每一寸土地都值得细细推敲。”</blockquote>
              <div className="flex items-end justify-between gap-4">
                <p>从一纸方案，到一座可生活、可生长的庭院。</p>
                <span className="font-serif text-6xl text-accent/20 leading-none">庭</span>
              </div>
            </div>
            <div className="grid grid-cols-2 mt-5 border-l border-t border-primary/10">
            {strengths.map((s, i) => (
              <Reveal key={s.title} delay={i * 100}>
                <div className="strength-item">
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </Reveal>
            ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
