import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import HeroBanner from '@/components/home/HeroBanner'
import CategoriesOverview from '@/components/home/CategoriesOverview'
import AboutBrief from '@/components/home/AboutBrief'
import VideoSection from '@/components/home/VideoSection'
import GalleryPreview from '@/components/home/GalleryPreview'


export const metadata = {
  title: '北京江润园林 - 别墅花园设计 | 屋顶花园设计 | 假山假水 | 工厂制作',
  description: '北京江润风景园林景观设计有限公司，专注别墅花园设计、屋顶花园设计、假山假水、工厂制作与庭院施工维护。',
}

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroBanner />
        <AboutBrief />
        <CategoriesOverview />
        <VideoSection />
        <GalleryPreview />
      </main>
      <Footer />
    </>
  )
}