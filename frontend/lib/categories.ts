/**
 * 网站栏目数据（仅保留栏目元信息：标题/简介/下拉子菜单）
 * 注意：案例数据统一由后端「案例管理」维护，按子菜单分类上传。
 * 前端不再内置任何示例案例（清空示例）。
 */

export interface Category {
  key: string
  title: string
  en: string
  subtitle: string
  intro: string[]
  /** 下拉子菜单 / 子模块（与后端分类树子级对应） */
  submenu: { label: string; slug: string }[]
}

export interface BackendCategory {
  id: number
  name: string
  name_en?: string
  slug: string
  subtitle?: string
  description?: string
  status?: number
  children?: BackendCategory[]
}

const CATEGORY_ORDER = ['landscape', 'villa', 'rooftop', 'rockery', 'factory'] as const

const CATEGORIES: Record<(typeof CATEGORY_ORDER)[number], Category> = {
  landscape: {
    key: 'landscape',
    title: '景观设计',
    en: 'LANDSCAPE',
    subtitle: '别墅项目 · 屋顶项目 · 景观工程',
    intro: [
      '景观设计是江润的综合性业务板块，涵盖居住区环境景观、城市公共空间及绿地、公园及旅游区、商业空间绿化等专业领域。',
      '依托原有建筑风格与空间特征，结合现代生活方式与审美，将生态、功能与形式有效融合，打造高品质、可持续的人居与公共环境。',
    ],
    submenu: [
      { label: '别墅项目', slug: 'landscape-villa' },
      { label: '屋顶项目', slug: 'landscape-rooftop' },
      { label: '景观工程', slug: 'landscape-works' },
    ],
  },
  villa: {
    key: 'villa',
    title: '别墅花园设计',
    en: 'HOUSES',
    subtitle: '现代 · 中式 · 日式 · 欧式',
    intro: [
      '别墅花园设计是江润的核心业务。我们依据别墅原有建筑风格与空间特征，结合现代人的生活方式与审美，将功能与形式完美融合。',
      '充分挖掘花园里每一块土地的价值，从功能布局、动线规划到植被配置、水景灯光，为每一座别墅打造独一无二的私家花园。',
    ],
    submenu: [
      { label: '现代风格', slug: 'villa-modern' },
      { label: '中式风格', slug: 'villa-chinese' },
      { label: '日式风格', slug: 'villa-japanese' },
      { label: '欧式风格', slug: 'villa-european' },
    ],
  },
  rooftop: {
    key: 'rooftop',
    title: '屋顶花园设计',
    en: 'ROOFTOP',
    subtitle: '屋顶花园 · 露台花园 · 室内花园',
    intro: [
      '在土地资源稀缺的都市，屋顶与露台是珍贵的绿色空间。我们从防水、排水、承重到植物配置、小品点缀，系统性地打造空中花园。',
      '兼具生态价值与生活品质，让城市生活也能拥有一方绿意与清风。',
    ],
    submenu: [
      { label: '屋顶花园', slug: 'rooftop-garden-roof' },
      { label: '露台花园', slug: 'rooftop-terrace' },
      { label: '室内花园', slug: 'rooftop-indoor' },
      { label: '花园养护', slug: 'rooftop-maintenance' },
    ],
  },
  rockery: {
    key: 'rockery',
    title: '假山假水',
    en: 'WATERSCAPE',
    subtitle: '鱼池过滤 · 泳池假山 · 喷泉水景',
    intro: [
      '假山假水是庭院的点睛之笔。山石、清泉、锦鲤、水声，让庭院即刻灵动。',
      '我们提供鱼池过滤系统、泳池假山、喷泉水景完整设计与施工服务，让山水意趣融入你的庭院。',
    ],
    submenu: [
      { label: '鱼池过滤', slug: 'rockery-pond' },
      { label: '泳池假山', slug: 'rockery-pool' },
      { label: '喷泉水景', slug: 'rockery-fountain' },
      { label: '自动灌溉', slug: 'rockery-irrigation' },
    ],
  },
  factory: {
    key: 'factory',
    title: '工厂制作',
    en: 'FACTORY',
    subtitle: '铝艺凉亭 · 户外地板 · 栏杆护栏 · 雨棚',
    intro: [
      '我们拥有线下工厂与专业制作团队，选用优质钢材、铝材与防腐木材。',
      '从下料、焊接、表面处理到现场安装，全流程把控品质，为庭院提供耐用、美观的户外设施。',
    ],
    submenu: [
      { label: '铝艺凉亭', slug: 'factory-pavilion' },
      { label: '户外地板', slug: 'factory-deck' },
      { label: '栏杆护栏', slug: 'factory-railing' },
      { label: '雨棚停车棚', slug: 'factory-canopy' },
    ],
  },
}

export function getCategories(): Category[] {
  return CATEGORY_ORDER.map((key) => CATEGORIES[key])
}

export function getCategory(key: string): Category | undefined {
  const direct = CATEGORIES[key as keyof typeof CATEGORIES]
  if (direct) return direct
  return getCategories().find((category) =>
    category.key === key || category.submenu.some((item) => item.slug === key),
  )
}

export function categoryFromBackend(category: BackendCategory, fallback?: Category): Category {
  const intro = (category.description || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return {
    key: category.slug,
    title: category.name,
    en: category.name_en || fallback?.en || category.slug.replaceAll('-', ' ').toUpperCase(),
    subtitle: category.subtitle || fallback?.subtitle || '',
    intro: intro.length ? intro : (fallback?.intro || []),
    submenu: (category.children || []).map((child) => ({ label: child.name, slug: child.slug })),
  }
}

export function findFallbackCategory(slug: string, name?: string): Category | undefined {
  return getCategories().find((category) =>
    category.key === slug || slug.includes(category.key) || category.title === name,
  )
}
