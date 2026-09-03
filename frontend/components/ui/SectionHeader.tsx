'use client'

import { useInView } from '@/lib/useInView'

/**
 * 区块标题：英文小注 + 中文主标题 + 金色装饰线。经典中式留白排版。
 */
export default function SectionHeader({
  kicker,
  title,
  align = 'center',
  light = false,
}: {
  kicker: string
  title: string
  align?: 'center' | 'left'
  light?: boolean
}) {
  const { ref, inView } = useInView()
  return (
    <div
      ref={ref}
      className={`${align === 'center' ? 'text-center' : 'text-left'} mb-14 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } transition-all duration-700`}
    >
      <div className={`section-kicker ${light ? 'text-accent' : ''}`}>{kicker}</div>
      <h2
        className={`section-title ${light ? 'text-white' : ''}`}
      >
        {title}
      </h2>
      <div className={`gold-line ${align === 'center' ? 'mx-auto' : 'ml-0'}`} />
    </div>
  )
}