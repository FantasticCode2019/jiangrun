'use client'

import Link from 'next/link'
import { useSettings } from '@/lib/settings'

const quickLinks = [
  { label: '关于江润', href: '/about' },
  { label: '设计案例', href: '/cases' },
  { label: '园林视频', href: '/videos' },
  { label: '服务项目', href: '/services' },
  { label: '公司动态', href: '/news' },
  { label: '联系我们', href: '/contact' },
]

const services = ['别墅花园设计', '屋顶花园设计', '露台花园设计', '庭院景观设计', '鱼池假山工程', '花园养护服务']

export default function Footer() {
  const settings = useSettings()

  return (
    <footer className="bg-primary-dark text-white/80">
      {/* 顶部金线装饰 */}
      <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)' }} />

      <div className="container-classic py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* 公司信息 */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div
                className="relative w-10 h-10 flex items-center justify-center shrink-0"
                style={{ border: '2px solid var(--accent)', transform: 'rotate(45deg)' }}
              >
                <span className="font-serif text-accent font-bold text-lg" style={{ transform: 'rotate(-45deg)' }}>
                  江
                </span>
              </div>
              <div className="leading-none">
                <div className="text-white font-serif text-lg font-bold tracking-[0.18em]">江润园林</div>
                <div className="mt-1 text-accent/60 text-[10px] tracking-[0.3em]">JIANG RUN LANDSCAPE</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-white/55">
              北京江润风景园林景观设计有限公司，专注别墅花园、屋顶花园、露台花园设计与施工维护，以匠心营造每一寸庭院雅境。
            </p>
          </div>

          {/* 快速链接 */}
          <div>
            <h3 className="relative text-white font-serif text-lg mb-6 pb-3" style={{ borderBottom: '1px solid var(--gold)' }}>
              快速链接
              <span className="absolute bottom-[-1px] left-0 h-px w-6 bg-accent" />
            </h3>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-white/60 hover:text-accent transition-colors text-sm group flex items-center gap-2">
                    <span className="w-1 h-1 rotate-45 bg-accent/50 group-hover:bg-accent transition-colors" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 服务项目 */}
          <div>
            <h4 className="relative text-white font-serif text-lg mb-3 pb-3" style={{ borderBottom: '1px solid var(--gold)' }}>
              服务项目
              <span className="absolute bottom-[-1px] left-0 h-px w-6 bg-accent" />
            </h4>
            <ul className="space-y-3">
              {services.map((item) => (
                <li key={item} className="flex items-center gap-2 text-white/60 text-sm">
                  <span className="w-1 h-1 rotate-45 bg-accent/50" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* 联系方式 */}
          <div>
            <h4 className="relative text-white font-serif text-lg mb-3 pb-3" style={{ borderBottom: '1px solid var(--gold)' }}>
              联系我们
              <span className="absolute bottom-[-1px] left-0 h-px w-6 bg-accent" />
            </h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-accent mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <div>
                  <div className="text-white/50">服务热线</div>
                  <div className="text-accent font-medium">{settings.phone || '13701024192'}</div>
                  {settings.mobile && <div className="text-accent font-medium">{settings.mobile}</div>}
                </div>
              </li>
              {settings.address && (
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-accent mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <div className="text-white/50">公司地址</div>
                    <div className="text-white/80">{settings.address}</div>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* 底部版权 */}
      <div className="border-t border-white/10">
        <div className="container-classic py-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="text-white/40 text-sm">
            © 2005-2024 {settings.site_name || '北京江润风景园林景观设计有限公司'} 版权所有
          </div>
          <div className="text-white/40 text-sm">
            <a href="http://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
              {settings.icp || '京ICP备19052372号-1'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}