import { useEffect, useState } from 'react'
import { Table, Button, Space, Tag, Popconfirm, message, Modal, Form, Input, Select, InputNumber } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { categoryAPI } from '../../services/api'

const typeLabels: Record<string, string> = {
  case: '案例', video: '视频', news: '新闻', service: '服务',
}

export default function CategoryList() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()
  const [filterType, setFilterType] = useState<string>('')

  useEffect(() => { loadData() }, [filterType])

  const loadData = async () => {
    setLoading(true)
    try {
      const res: any = await categoryAPI.getList(filterType ? { type: filterType } : {})
      setData(res.data || [])
    } catch (err) { message.error('加载失败') } finally { setLoading(false) }
  }

  const handleSave = async (values: any) => {
    try {
      if (editing) { await categoryAPI.update(editing.id, values); message.success('更新成功') }
      else { await categoryAPI.create(values); message.success('创建成功') }
      setModalOpen(false); setEditing(null); form.resetFields(); loadData()
    } catch (err: any) { message.error(err.message || '操作失败') }
  }

  const handleDelete = async (id: number) => {
    try { await categoryAPI.delete(id); message.success('删除成功'); loadData() }
    catch (err: any) { message.error(err.message || '删除失败') }
  }

  const openEdit = (record?: any) => {
    setEditing(record || null)
    if (record) form.setFieldsValue(record)
    else form.resetFields()
    setModalOpen(true)
  }

  const columns = [
    { title: '名称', dataIndex: 'name' },
    { title: '英文名', dataIndex: 'name_en' },
    { title: 'Slug', dataIndex: 'slug' },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag>{typeLabels[v] || v}</Tag> },
    { title: '排序', dataIndex: 'sort_order', width: 80 },
    { title: '操作', width: 160,
      render: (_: any, record: any) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ) },
  ]

  // 展开子分类
  const expandedData = data.map((cat: any) => ({
    ...cat,
    children: cat.children?.length ? cat.children : undefined,
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Select placeholder="筛选类型" allowClear style={{ width: 150 }}
          onChange={(v) => setFilterType(v || '')}
          options={Object.entries(typeLabels).map(([k, v]) => ({ value: k, label: v }))} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>新增分类</Button>
      </div>
      <Table columns={columns} dataSource={expandedData} rowKey="id" loading={loading}
        pagination={false} defaultExpandAllRows />

      <Modal title={editing ? '编辑分类' : '新增分类'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null) }}
        onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name_en" label="英文名"><Input /></Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={Object.entries(typeLabels).map(([k, v]) => ({ value: k, label: v }))} />
          </Form.Item>
          <Form.Item name="parent_id" label="父分类">
            <Select allowClear placeholder="无 (顶级分类)"
              options={data.map((c: any) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="sort_order" label="排序"><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
