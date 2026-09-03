import CategoryPage from '@/components/pages/CategoryPage'

export default async function ManagedCategoryPage({ params }: { params: Promise<{ category: string }> }) {
	const { category } = await params
	return <CategoryPage categoryKey={category} />
}
