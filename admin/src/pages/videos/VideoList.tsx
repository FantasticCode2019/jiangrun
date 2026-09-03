import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Space, Tag, Image, Popconfirm, message, Input, Select } from 'antd'
import { PlusOutlined, SearchOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { videoAPI, categoryAPI } from '../../services/api'

export default function VideoList() {
  const navigate = useNavigate()
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => { loadCategories() }, [])
  useEffect(() => { loadData() }, [page, keyword, categoryId])

  const loadCategories = async () => {
    try {
      const res: any = await categoryAPI.getList({ type: 'video' })
      setCategories(res.data || [])
    } catch (err) { /* ignore */ }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res: any = await videoAPI.getList({ page, size: 20, keyword, category_id: categoryId })
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
      await videoAPI.delete(id)
      message.success('删除成功')
      loadData()
    } catch (err) {
      message.error('删除失败')
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  const columns = [
    {
      title: '封面', dataIndex: 'cover_image', width: 120,
      render: (url: string) => url ? (
        <div style={{ position: 'relative' }}>
          <Image src={url} width={100} height={75} style={{ objectFit: 'cover' }} />
          <PlayCircleOutlined style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 24, color: '#fff', textShadow: '0 0 4px rgba(0,0,0,0.5)' }} />
        </div>
      ) : '-',
    },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    {
      title: '分类', dataIndex: ['category', 'name'], width: 120,
    },
    {
      title: '时长', dataIndex: 'duration', width: 80,
      render: formatDuration,
    },
    {
      title: '播放量', dataIndex: 'view_count', width: 80,
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
          <Button type="link" size="small" onClick={() => navigate(`/videos/edit/${record.id}`)}>编辑</Button>
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
            options={categories.map((c: any) => ({ value: String(c.id), label: c.name }))} />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/videos/new')}>
          新增视频
        </Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage }} />
    </div>
  )
}
