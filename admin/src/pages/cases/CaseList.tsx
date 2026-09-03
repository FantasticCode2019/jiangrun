import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Space, Tag, Image, Popconfirm, message, Input, Select } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { caseAPI, categoryAPI } from '../../services/api'

export default function CaseList() {
  const navigate = useNavigate()
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadData()
  }, [page, keyword, categoryId])

  const loadCategories = async () => {
    try {
      const res: any = await categoryAPI.getList({ type: 'case' })
      setCategories(res.data || [])
    } catch (err) { /* ignore */ }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res: any = await caseAPI.getList({ page, size: 20, keyword, category_id: categoryId })
      setData(res.data.list || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await caseAPI.delete(id)
      message.success('删除成功')
      loadData()
    } catch (err) {
      message.error('删除失败')
    }
  }

  const columns = [
    {
      title: '封面', dataIndex: 'cover_image', width: 100,
      render: (url: string) => url ? <Image src={url} width={80} height={60} style={{ objectFit: 'cover' }} /> : '-',
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '风格', dataIndex: 'style', width: 100 },
    { title: '地点', dataIndex: 'location', width: 150, ellipsis: true },
    {
      title: '分类', dataIndex: ['category', 'name'], width: 120,
    },
    {
      title: '推荐', dataIndex: 'is_featured', width: 80,
      render: (v: boolean) => v ? <Tag color="gold">推荐</Tag> : '-',
    },
    {
      title: '状态', dataIndex: 'status', width: 80,
      render: (v: number) => <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '发布' : '草稿'}</Tag>,
    },
    {
      title: '操作', width: 160,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/cases/edit/${record.id}`)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Input placeholder="搜索标题" prefix={<SearchOutlined />} allowClear
            style={{ width: 200 }} onChange={(e) => { setKeyword(e.target.value); setPage(1) }} />
          <Select placeholder="选择分类" allowClear style={{ width: 150 }}
            onChange={(v) => { setCategoryId(v || ''); setPage(1) }}
            options={categories.flatMap((c: any) => [
              { value: String(c.id), label: c.name },
              ...(c.children || []).map((ch: any) => ({ value: String(ch.id), label: `  └ ${ch.name}` })),
            ])} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/cases/new')}>
          新增案例
        </Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage }} />
    </div>
  )
}
