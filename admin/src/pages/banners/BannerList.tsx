import { useEffect, useState } from 'react'
import { Table, Button, Space, Tag, Image, Popconfirm, message, Modal, Form, Input, Select, InputNumber, Upload } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { bannerAPI, uploadAPI } from '../../services/api'

export default function BannerList() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form] = Form.useForm()

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try { const res: any = await bannerAPI.getList(); setData(res.data || []) }
    catch (err) { message.error('加载失败') } finally { setLoading(false) }
  }

  const handleSave = async (values: any) => {
    try {
      if (editing) { await bannerAPI.update(editing.id, values); message.success('更新成功') }
      else { await bannerAPI.create(values); message.success('创建成功') }
      setModalOpen(false); setEditing(null); form.resetFields(); loadData()
    } catch (err: any) { message.error(err.message || '操作失败') }
  }

  const handleDelete = async (id: number) => {
    try { await bannerAPI.delete(id); message.success('删除成功'); loadData() }
    catch (err) { message.error('删除失败') }
  }

  const handleUpload = async (file: any) => {
    try {
      const res: any = await uploadAPI.image(file)
      form.setFieldValue('image_url', res.data.url)
      message.success('上传成功')
    } catch (err) { message.error('上传失败') }
    return false
  }

  const openEdit = (record?: any) => {
    setEditing(record || null)
    if (record) form.setFieldsValue(record)
    else form.resetFields()
    setModalOpen(true)
  }

  const columns = [
    { title: '图片', dataIndex: 'image_url', width: 200,
      render: (url: string) => url ? <Image src={url} width={180} height={80} style={{ objectFit: 'cover' }} /> : '-' },
    { title: '标题', dataIndex: 'title' },
    { title: '位置', dataIndex: 'position', render: (v: string) => <Tag>{v}</Tag> },
    { title: '排序', dataIndex: 'sort_order', width: 80 },
    { title: '状态', dataIndex: 'status', width: 80,
      render: (v: number) => <Tag color={v === 1 ? 'green' : 'default'}>{v === 1 ? '显示' : '隐藏'}</Tag> },
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEdit()}>新增轮播图</Button>
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} />

      <Modal title={editing ? '编辑轮播图' : '新增轮播图'} open={modalOpen}
        onCancel={() => { setModalOpen(false); setEditing(null) }}
        onOk={() => form.submit()} destroyOnClose width={600}>
        <Form form={form} layout="vertical" onFinish={handleSave}
          initialValues={{ position: 'home', status: 1, sort_order: 0 }}>
          <Form.Item name="title" label="标题"><Input /></Form.Item>
          <Form.Item name="subtitle" label="副标题"><Input maxLength={500} showCount /></Form.Item>
          <Form.Item label="图片">
            <Space>
              <Upload showUploadList={false} beforeUpload={handleUpload} accept="image/*"><Button>上传</Button></Upload>
              <Form.Item name="image_url" noStyle rules={[{ required: true }]}><Input placeholder="或输入URL" style={{ width: 300 }} /></Form.Item>
            </Space>
          </Form.Item>
          <Form.Item name="link_url" label="链接URL"><Input placeholder="点击跳转链接 (可选)" /></Form.Item>
          <Space>
            <Form.Item name="position" label="位置">
              <Select options={[
                { value: 'home', label: '首页' },
              ]} />
            </Form.Item>
            <Form.Item name="sort_order" label="排序"><InputNumber min={0} /></Form.Item>
            <Form.Item name="status" label="状态">
              <Select options={[{ value: 1, label: '显示' }, { value: 0, label: '隐藏' }]} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  )
}
