import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Space, Tag, Popconfirm, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { serviceAPI } from '../../services/api'

export default function ServiceList() {
  const navigate = useNavigate()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const res: any = await serviceAPI.getList()
      setData(res.data.list || res.data || [])
    } catch (err) { message.error('加载失败') } finally { setLoading(false) }
  }

  const handleDelete = async (id: number) => {
    try { await serviceAPI.delete(id); message.success('删除成功'); loadData() }
    catch (err) { message.error('删除失败') }
  }

  const columns = [
    { title: '标题', dataIndex: 'title' },
    { title: '图标', dataIndex: 'icon', width: 80 },
    { title: '排序', dataIndex: 'sort_order', width: 80 },
    { title: '状态', dataIndex: 'status', width: 80,
      render: (v: number) => <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '发布' : '草稿'}</Tag> },
    { title: '操作', width: 160,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => navigate(`/services/edit/${record.id}`)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ) },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/services/new')}>新增服务</Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} />
    </div>
  )
}
