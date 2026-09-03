'use client'

import { type ReactNode } from 'react'
import { useInView } from '@/lib/useInView'

/**
 * 滚动进入视口时的淡入/上移动画容器，统一交互动效。
 */
export default function Reveal({
  children,
  delay = 0,
  className = '',
  from = 'up',
}: {
  children: ReactNode
  delay?: number
  className?: string
  from?: 'up' | 'left' | 'right'
}) {
  const { ref, inView } = useInView()

  const hidden =
    from === 'left'
      ? 'opacity-0 -translate-x-10'
      : from === 'right'
        ? 'opacity-0 translate-x-10'
        : 'opacity-0 translate-y-8'

  return (
    <div
      ref={ref}
      className={`${className} ${inView ? 'opacity-100 translate-x-0 translate-y-0' : hidden} transition-all duration-700 ease-out`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}