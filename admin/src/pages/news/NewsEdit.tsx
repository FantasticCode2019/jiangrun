import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Form, Input, Select, Button, Upload, message, Card, Space } from 'antd'
import { newsAPI, uploadAPI } from '../../services/api'

const { TextArea } = Input

export default function NewsEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const isEdit = !!id

  useEffect(() => { if (isEdit) loadData() }, [id])

  const loadData = async () => {
    try {
      const res: any = await newsAPI.getById(Number(id))
      form.setFieldsValue(res.data)
    } catch (err) { message.error('加载失败') }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      if (isEdit) { await newsAPI.update(Number(id), values); message.success('更新成功') }
      else { await newsAPI.create(values); message.success('创建成功') }
      navigate('/news')
    } catch (err: any) { message.error(err.message || '操作失败') } finally { setLoading(false) }
  }

  const handleUploadCover = async (file: any) => {
    try {
      const res: any = await uploadAPI.image(file)
      form.setFieldValue('cover_image', res.data.url)
      message.success('上传成功')
    } catch (err) { message.error('上传失败') }
    return false
  }

  return (
    <Card title={isEdit ? '编辑新闻' : '新增新闻'}>
      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 1 }}>
        <Form.Item name="title" label="标题" rules={[{ required: true }]}>
          <Input placeholder="新闻标题" />
        </Form.Item>
        <Form.Item label="封面图">
          <Space>
            <Upload showUploadList={false} beforeUpload={handleUploadCover} accept="image/*">
              <Button>上传封面</Button>
            </Upload>
            <Form.Item name="cover_image" noStyle><Input placeholder="或输入URL" style={{ width: 400 }} /></Form.Item>
          </Space>
        </Form.Item>
        <Form.Item name="summary" label="摘要"><TextArea rows={2} placeholder="新闻摘要" /></Form.Item>
        <Form.Item name="content" label="内容"><TextArea rows={12} placeholder="新闻内容 (支持HTML)" /></Form.Item>
        <Form.Item name="status" label="状态">
          <Select options={[{ value: 1, label: '发布' }, { value: 0, label: '草稿' }]} />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>{isEdit ? '更新' : '创建'}</Button>
            <Button onClick={() => navigate('/news')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
