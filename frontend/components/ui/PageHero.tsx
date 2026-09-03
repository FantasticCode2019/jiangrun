/**
 * 页面顶部横幅（内页统一使用）
 * 深绿渐变 + 金色光晕 + 棱形装饰，替换原先各处重复的 h-[40vh] 区块。
 */
export default function PageHero({
  title,
  kicker,
}: {
  title: string
  kicker: string
}) {
  return (
    <section className="page-hero">
      <div className="relative z-10 text-center px-6 py-16">
        {/* 顶部细金线装饰 */}
        <div className="mx-auto mb-8 flex items-center gap-4 justify-center">
          <span className="h-px w-10 bg-accent/60" />
          <span className="w-2 h-2 rotate-45 bg-accent" />
          <span className="h-px w-10 bg-accent/60" />
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-white font-bold tracking-wide">
          {title}
        </h1>
        <div className="mt-5 text-accent tracking-[0.4em] text-sm uppercase">
          {kicker}
        </div>
        {/* 底部装饰线 */}
        <div className="mt-8 mx-auto flex items-center gap-3 justify-center">
          <span className="h-px w-10 bg-accent/60" />
          <span className="w-2 h-2 rotate-45 border border-accent/70" />
          <span className="h-px w-10 bg-accent/60" />
        </div>
      </div>
    </section>
  )
}