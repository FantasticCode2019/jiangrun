import { useEffect, useState } from 'react'
import { Table, Button, Tag, Popconfirm, message, Space } from 'antd'
import { contactAPI } from '../../services/api'

export default function ContactList() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try { const res: any = await contactAPI.getList(); setData(res.data || []) }
    catch (err) { message.error('加载失败') } finally { setLoading(false) }
  }

  const handleMarkRead = async (id: number) => {
    try { await contactAPI.markRead(id); message.success('已标记'); loadData() }
    catch (err) { message.error('操作失败') }
  }

  const handleDelete = async (id: number) => {
    try { await contactAPI.delete(id); message.success('删除成功'); loadData() }
    catch (err) { message.error('删除失败') }
  }

  const columns = [
    { title: '姓名', dataIndex: 'name', width: 100 },
    { title: '电话', dataIndex: 'phone', width: 140 },
    { title: '邮箱', dataIndex: 'email', width: 180 },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '状态', dataIndex: 'is_read', width: 80,
      render: (v: boolean) => <Tag color={v ? 'default' : 'red'}>{v ? '已读' : '未读'}</Tag> },
    { title: '时间', dataIndex: 'created_at', width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN') },
    { title: '操作', width: 160,
      render: (_: any, record: any) => (
        <Space>
          {!record.is_read && <Button type="link" size="small" onClick={() => handleMarkRead(record.id)}>标为已读</Button>}
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ) },
  ]

  return (
    <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} />
  )
}
