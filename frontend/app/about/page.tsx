'use client'

import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PageHero from '@/components/ui/PageHero'
import Reveal from '@/components/ui/Reveal'
import { useSettings } from '@/lib/settings'

const advantages = [
  { title: '创新设计的团队', desc: '为用户提供全套科学的设计方案' },
  { title: '线下工厂生产', desc: '现场安装，提高产品质量和工作效率，节约客户时间' },
  { title: '专业的技师', desc: '跟踪生产过程每个细节，注重工程品质' },
  { title: '赤诚的服务之心', desc: '为客户提供忠实、尽责的服务' },
]

const philosophies = [
  { title: '功能至上', desc: '我们注重功能设计，功能决定形式。每一寸土地都值得细细推敲，不容浪费。' },
  { title: '经济环保', desc: '倡导经济性和环保，尽可能利用原场地中一切能够利用的元素，减少浪费。' },
  { title: '简约实用', desc: '摒弃无谓而奢华的装饰，追求简约和实用的设计，营造高品质生活空间。' },
]

const achievements = [
  '北京朝莱红太阳生态园',
  '南四环南国水乡生态美食城',
  '世界花卉大观园——主温室',
  '世界花卉大观园——贵宾接待厅',
  '武警水电指挥总部——空中花园',
  '多个高端别墅花园项目',
]

export default function AboutPage() {
	const settings = useSettings()
  return (
    <>
      <Header />
      <main>
        <PageHero title="关于江润" kicker="ABOUT JRLA" />

        {/* Company Intro */}
        <section className="py-24 bg-white">
          <div className="container-classic">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="section-kicker">COMPANY PROFILE</div>
                <h2 className="section-title">公司简介</h2>
                <div className="relative h-px w-[220px] my-6" style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
                <div className="space-y-5 text-ink-light leading-relaxed">
				  <p>{settings.about_intro || '北京江润风景园林景观设计有限公司成立于2005年，经过多年发展，已成长为集园林苗木培育、庭院景观设计、别墅花园设计、屋顶花园设计、露台花园设计、工厂园林规划、商业地产景观设计、家居花木陈设设计、商业空间绿化等为一体的专业化设计、施工及养护的园林绿化品牌企业。'}</p>
                  <p>我们的优势在于：</p>
                  <ul className="space-y-3">
                    {advantages.map((item) => (
                      <li key={item.title} className="flex items-start gap-3">
                        <span className="mt-2 w-2 h-2 rotate-45 bg-accent shrink-0" />
                        <span>
                          <strong className="text-ink">{item.title}</strong>
                          <span className="text-accent-dark/70"> —— </span>
                          <span>{item.desc}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Reveal from="right">
                <div className="relative">
                  <div className="absolute -top-3 -right-3 w-full h-full border border-accent/40" aria-hidden />
                  <div className="aspect-[4/3] bg-cream-dark flex items-center justify-center relative overflow-hidden">
                    <div className="text-8xl">🏢</div>
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(26,60,42,0.12), transparent)' }} />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Design Philosophy */}
        <section className="py-24 bg-cream">
          <div className="container-classic">
            <div className="text-center mb-14">
              <div className="section-kicker">DESIGN PHILOSOPHY</div>
              <h2 className="section-title">设计理念</h2>
              <div className="gold-line" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {philosophies.map((item, index) => (
                <Reveal key={item.title} delay={index * 120}>
                  <div className="bg-white p-10 text-center service-card h-full">
                    <div className="mx-auto mb-6 flex items-center justify-center">
                      <span className="w-12 h-px bg-accent/40" />
                      <span className={`font-serif text-3xl font-bold mx-5 text-primary`}>
                        {['壹', '贰', '叁'][index]}
                      </span>
                      <span className="w-12 h-px bg-accent/40" />
                    </div>
                    <h3 className="font-serif text-xl text-primary font-semibold mb-4">{item.title}</h3>
                    <p className="text-ink-light leading-relaxed">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section className="py-24 bg-white">
          <div className="container-classic">
            <div className="text-center mb-14">
              <div className="section-kicker">ACHIEVEMENTS</div>
              <h2 className="section-title">工程业绩</h2>
              <div className="gold-line" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {achievements.map((item, index) => (
                <Reveal key={item} delay={index * 80}>
                  <div className="flex items-center gap-4 p-5 bg-cream hover:bg-cream-dark transition-colors duration-300">
                    <span className="font-serif text-2xl font-bold text-accent/60">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="w-px h-8 bg-accent/40" />
                    <span className="text-ink">{item}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
