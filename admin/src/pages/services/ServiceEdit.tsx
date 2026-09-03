import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Form, Input, Select, InputNumber, Button, Upload, message, Card, Space } from 'antd'
import { serviceAPI, uploadAPI } from '../../services/api'

const { TextArea } = Input

export default function ServiceEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const isEdit = !!id

  useEffect(() => { if (isEdit) loadData() }, [id])

  const loadData = async () => {
    try {
      const res: any = await serviceAPI.getById(Number(id))
      form.setFieldsValue(res.data)
    } catch (err) { message.error('加载失败') }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      if (isEdit) { await serviceAPI.update(Number(id), values); message.success('更新成功') }
      else { await serviceAPI.create(values); message.success('创建成功') }
      navigate('/services')
    } catch (err: any) { message.error(err.message || '操作失败') } finally { setLoading(false) }
  }

  const handleUpload = async (file: any) => {
    try {
      const res: any = await uploadAPI.image(file)
      form.setFieldValue('cover_image', res.data.url)
      message.success('上传成功')
    } catch (err) { message.error('上传失败') }
    return false
  }

  return (
    <Card title={isEdit ? '编辑服务' : '新增服务'}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 1, sort_order: 0 }}>
        <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="slug" label="Slug" rules={[{ required: true }]}><Input placeholder="URL标识, 如 garden-design" /></Form.Item>
        <Form.Item name="icon" label="图标"><Input placeholder="图标类名或emoji" /></Form.Item>
        <Form.Item label="封面">
          <Space>
            <Upload showUploadList={false} beforeUpload={handleUpload} accept="image/*"><Button>上传</Button></Upload>
            <Form.Item name="cover_image" noStyle><Input placeholder="或输入URL" style={{ width: 400 }} /></Form.Item>
          </Space>
        </Form.Item>
        <Form.Item name="description" label="简介"><TextArea rows={3} /></Form.Item>
        <Form.Item name="content" label="详情"><TextArea rows={8} placeholder="支持HTML" /></Form.Item>
        <Space>
          <Form.Item name="sort_order" label="排序"><InputNumber min={0} /></Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[{ value: 1, label: '发布' }, { value: 0, label: '草稿' }]} />
          </Form.Item>
        </Space>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>{isEdit ? '更新' : '创建'}</Button>
            <Button onClick={() => navigate('/services')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
