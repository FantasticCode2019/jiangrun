'use client'

import { useState } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import PageHero from '@/components/ui/PageHero'
import { api } from '@/lib/api'
import { useSettings } from '@/lib/settings'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', content: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const settings = useSettings()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.submitContact(form)
      setSubmitted(true)
      setForm({ name: '', phone: '', email: '', content: '' })
    } catch (err) {
      alert('提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const contactItems = [
    {
      label: '服务热线',
      icon: (
        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      content: (
        <>
          <div className="text-ink font-medium" style={{ color: 'var(--accent-dark)' }}>{settings.phone || '13701024192'}</div>
          {settings.mobile && <div className="text-ink">{settings.mobile}</div>}
        </>
      ),
    },
    {
      label: '设计部',
      icon: (
        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
	  content: <div className="text-ink">{settings.design_address || settings.address || '北京顺义区南法信马可汇三号楼一单元901'}</div>,
    },
    {
      label: '工厂地址',
      icon: (
        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
	  content: <div className="text-ink">{settings.factory_address || '北京顺义区西马各庄农业生态园 B911 栋'}</div>,
    },
    {
      label: '工作时间',
      icon: (
        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
	  content: <div className="text-ink">{settings.business_hours || '周一至周六 9:00 - 18:00'}</div>,
    },
  ]

  const inputCls =
    'w-full px-4 py-3 bg-cream border border-transparent focus:outline-none focus:border-accent focus:bg-white transition-colors text-sm'

  return (
    <>
      <Header />
      <main>
        <PageHero title="联系我们" kicker="CONTACT US" />

        <section className="py-20 bg-white">
          <div className="container-classic">
            <div>
              <div className="section-kicker">CONTACT INFO</div>
              <h2 className="section-title">联系方式</h2>
              <div className="relative h-px w-[220px] my-8" style={{ background: 'linear-gradient(90deg, var(--accent), transparent)' }} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                {contactItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-4 p-6 bg-cream hover:bg-cream-dark transition-colors duration-300">
                    <div className="w-12 h-12 flex items-center justify-center shrink-0" style={{ border: '1px solid var(--accent)' }}>
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-medium text-primary mb-2 tracking-wide">{item.label}</div>
                      <div className="space-y-1 text-sm leading-relaxed">{item.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <div className="section-kicker">ONLINE MESSAGE</div>
                <h2 className="section-title">在线留言</h2>
                <div className="gold-line" />
              </div>

              {submitted ? (
                <div className="bg-cream p-10 text-center" style={{ border: '1px solid var(--accent)' }}>
                  <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-full bg-accent/15">
                    <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-ink text-xl font-serif font-semibold mb-2">留言提交成功！</div>
                  <div className="text-ink-light">我们会尽快联系您，感谢您的关注。</div>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="btn-classic mt-8"
                  >
                    继续留言
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-ink/80 mb-2">您的姓名 *</label>
                    <input type="text" required value={form.name} className={inputCls}
					  maxLength={50}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="请输入您的姓名" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-ink/80 mb-2">联系电话</label>
                      <input type="tel" value={form.phone} className={inputCls}
						maxLength={20}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="请输入联系电话" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink/80 mb-2">电子邮箱</label>
                      <input type="email" value={form.email} className={inputCls}
						maxLength={100}
                        onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="请输入电子邮箱" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink/80 mb-2">留言内容 *</label>
                    <textarea required rows={5} value={form.content} className={`${inputCls} resize-none`}
					  maxLength={2000}
                      onChange={(e) => setForm({ ...form, content: e.target.value })}
                      placeholder="请描述您的需求，如花园面积、风格偏好、预算等" />
                  </div>
                  <div className="text-center">
                    <button type="submit" disabled={submitting} className="btn-dark w-full sm:w-auto disabled:opacity-50">
                      {submitting ? '提交中...' : '提 交 留 言'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
