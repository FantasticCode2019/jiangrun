import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Form, Input, Select, Switch, InputNumber, Button, Upload, message, Card, Space, Progress } from 'antd'
import { PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { videoAPI, categoryAPI, caseAPI, uploadAPI } from '../../services/api'

const { TextArea } = Input

export default function VideoEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  const isEdit = !!id

  useEffect(() => {
    loadCategories()
    loadCases()
    if (isEdit) loadData()
  }, [id])

  const loadCategories = async () => {
    try {
      const res: any = await categoryAPI.getList({ type: 'video' })
      setCategories(res.data || [])
    } catch (err) { /* ignore */ }
  }

  const loadCases = async () => {
    try {
      const res: any = await caseAPI.getList({ page: 1, size: 100 })
      setCases(res.data.list || [])
    } catch (err) { /* ignore */ }
  }

  const loadData = async () => {
    try {
      const res: any = await videoAPI.getById(Number(id))
      form.setFieldsValue(res.data)
    } catch (err) {
      message.error('加载失败')
    }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      if (isEdit) {
        await videoAPI.update(Number(id), values)
        message.success('更新成功')
      } else {
        await videoAPI.create(values)
        message.success('创建成功')
      }
      navigate('/videos')
    } catch (err: any) {
      message.error(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadCover = async (file: any) => {
    try {
      const res: any = await uploadAPI.image(file)
      form.setFieldValue('cover_image', res.data.url)
      message.success('封面上传成功')
    } catch (err) {
      message.error('上传失败')
    }
    return false
  }

  const handleUploadVideo = async (file: any) => {
    setUploading(true)
    setUploadProgress(0)
	try {
	  const url = await uploadAPI.chunkUpload(file, 'videos', setUploadProgress)
	  form.setFieldValue('video_url', url)
      message.success('视频上传成功')
    } catch (err) {
      message.error('视频上传失败')
    } finally {
      setUploading(false)
    }
    return false
  }

  return (
    <Card title={isEdit ? '编辑视频' : '新增视频'}>
      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{ status: 1, is_featured: false, sort_order: 0, video_type: 'local' }}>
        <Form.Item name="title" label="标题" rules={[{ required: true }]}>
          <Input placeholder="请输入视频标题" />
        </Form.Item>

        <Space size="large" style={{ display: 'flex' }}>
          <Form.Item name="category_id" label="分类" style={{ width: 200 }}>
            <Select placeholder="选择分类" allowClear
              options={categories.map((c: any) => ({ value: c.id, label: c.name }))} />
          </Form.Item>
          <Form.Item name="related_case_id" label="关联案例" style={{ width: 300 }}>
            <Select placeholder="选择关联案例" allowClear showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={cases.map((c: any) => ({ value: c.id, label: c.title }))} />
          </Form.Item>
          <Form.Item name="duration" label="时长(秒)" style={{ width: 150 }}>
            <InputNumber min={0} placeholder="秒" style={{ width: '100%' }} />
          </Form.Item>
        </Space>

        <Form.Item label="封面图">
          <Space>
            <Upload showUploadList={false} beforeUpload={handleUploadCover} accept="image/*">
              <Button>上传封面</Button>
            </Upload>
            <Form.Item name="cover_image" noStyle>
              <Input placeholder="或输入封面URL" style={{ width: 400 }} />
            </Form.Item>
          </Space>
          {form.getFieldValue('cover_image') && (
            <img src={form.getFieldValue('cover_image')} alt="封面"
              style={{ marginTop: 8, maxWidth: 300, maxHeight: 200 }} />
          )}
        </Form.Item>

        <Form.Item label="视频文件">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload showUploadList={false} beforeUpload={handleUploadVideo}
              accept="video/mp4,video/mov,video/avi,video/mkv,video/webm">
              <Button icon={<UploadOutlined />} loading={uploading} disabled={uploading}>
                {uploading ? '上传中...' : '上传视频'}
              </Button>
            </Upload>
            {uploading && <Progress percent={uploadProgress} status="active" />}
            <Form.Item name="video_url" noStyle rules={[{ required: true, message: '请上传视频或输入URL' }]}>
              <Input placeholder="视频URL (上传后自动填入)" />
            </Form.Item>
          </Space>
        </Form.Item>

        <Form.Item name="description" label="简介">
          <TextArea rows={3} placeholder="视频简介" />
        </Form.Item>

        <Form.Item name="content" label="详细内容">
          <TextArea rows={8} placeholder="详细内容 (支持HTML)" />
        </Form.Item>

        <Space size="large">
          <Form.Item name="is_featured" label="推荐" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select options={[
              { value: 1, label: '发布' },
              { value: 0, label: '草稿' },
            ]} />
          </Form.Item>
        </Space>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '更新' : '创建'}
            </Button>
            <Button onClick={() => navigate('/videos')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
