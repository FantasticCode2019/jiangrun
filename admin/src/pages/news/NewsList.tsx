import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Space, Tag, Image, Popconfirm, message, Input } from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { newsAPI } from '../../services/api'

export default function NewsList() {
  const navigate = useNavigate()
  const [data, setData] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')

  useEffect(() => { loadData() }, [page, keyword])

  const loadData = async () => {
    setLoading(true)
    try {
      const res: any = await newsAPI.getList({ page, size: 20, keyword })
      setData(res.data.list || [])
      setTotal(res.data.total || 0)
    } catch (err) { message.error('加载失败') } finally { setLoading(false) }
  }

  const handleDelete = async (id: number) => {
    try { await newsAPI.delete(id); message.success('删除成功'); loadData() }
    catch (err) { message.error('删除失败') }
  }

  const columns = [
    { title: '封面', dataIndex: 'cover_image', width: 100,
      render: (url: string) => url ? <Image src={url} width={80} height={60} style={{ objectFit: 'cover' }} /> : '-' },
    { title: '标题', dataIndex: 'title', ellipsis: true },
    { title: '浏览量', dataIndex: 'view_count', width: 80 },
    { title: '状态', dataIndex: 'status', width: 80,
      render: (v: number) => <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '发布' : '草稿'}</Tag> },
    { title: '操作', width: 160,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/news/edit/${record.id}`)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ) },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input placeholder="搜索标题" prefix={<SearchOutlined />} allowClear style={{ width: 250 }}
          onChange={(e) => { setKeyword(e.target.value); setPage(1) }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/news/new')}>新增新闻</Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage }} />
    </div>
  )
}
