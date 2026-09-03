import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Form, Input, Select, TreeSelect, Switch, InputNumber, Button, message, Card, Space } from 'antd'
import ContentBlockEditor from '../../components/ContentBlockEditor'
import type { CaseBlock } from '../../components/ContentBlockEditor'
import { caseAPI, categoryAPI } from '../../services/api'

/** 把后台返回的扁平分类数组，整理成「仅顶层分类 → 其子分类」的树，去重归并 */
function buildCleanTree(categories: any[]): any[] {
  const byId = new Map<number, any>()
  for (const c of categories || []) byId.set(c.id, { ...c, children: [] })

  const roots: any[] = []
  for (const c of byId.values()) {
    if (c.parent_id && byId.has(c.parent_id)) {
      byId.get(c.parent_id).children.push(c)
    } else {
      roots.push(c)
    }
  }
  // 只保留有子分类的顶层作为可选(叶子在 children 里)；没子分类的顶层也保留为叶子
  return roots
    .map((r) => ({ id: r.id, name: r.name, children: r.children }))
    .sort((a, b) => a.id - b.id)
}

export default function CaseEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [blocks, setBlocks] = useState<CaseBlock[]>([])

  const isEdit = !!id

  useEffect(() => {
    loadCategories()
    if (isEdit) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const loadCategories = async () => {
    try {
      const res: any = await categoryAPI.getList({ type: 'case' })
      setCategories(buildCleanTree(res.data || []))
    } catch {
      /* ignore */
    }
  }

  const loadData = async () => {
    try {
      const res: any = await caseAPI.getById(Number(id))
      const d = res.data
      form.setFieldsValue(d)
      setBlocks(d.blocks && Array.isArray(d.blocks) ? d.blocks : [])
    } catch {
      message.error('加载失败')
    }
  }

  const treeData = useMemo(
    () =>
      categories.map((c: any) => {
        const hasChildren = !!(c.children && c.children.length)
        return {
          value: c.id,
          title: hasChildren ? c.name : c.name,
          selectable: !hasChildren,
          disabled: hasChildren,
          children: hasChildren ? c.children.map((ch: any) => ({ value: ch.id, title: ch.name, isLeaf: true })) : undefined,
        }
      }),
    [categories],
  )

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      const payload = { ...values, blocks }
      if (isEdit) {
        await caseAPI.update(Number(id), payload)
        message.success('更新成功')
      } else {
        await caseAPI.create(payload)
        message.success('创建成功')
      }
      navigate('/cases')
    } catch (err: any) {
      message.error(err?.response?.data?.message || err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card title={isEdit ? '编辑案例' : '新增案例'}>
      <Form form={form} layout="vertical" onFinish={onFinish}
        initialValues={{ status: 1, is_featured: false, sort_order: 0 }}>
        <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
          <Input placeholder="请输入案例标题" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="category_id" label="所属子菜单分类"
          rules={[{ required: true, message: '请选择子菜单分类' }]}>
          <TreeSelect
            placeholder="选择子菜单分类"
            allowClear
            treeNodeFilterProp="title"
            treeData={treeData}
            style={{ width: 300 }}
          />
        </Form.Item>

        <Space size="large" style={{ display: 'flex' }}>
          <Form.Item name="style" label="风格">
            <Select
              allowClear
              placeholder="选择风格"
              style={{ width: 160 }}
              options={[
                { value: 'modern', label: '现代风格' },
                { value: 'chinese', label: '中式风格' },
                { value: 'japanese', label: '日式风格' },
                { value: 'european', label: '欧式风格' },
              ]}
            />
          </Form.Item>
          <Form.Item name="location" label="项目地点">
            <Input placeholder="如: 北京朝阳" style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="area" label="面积">
            <Input placeholder="如: 200㎡" style={{ width: 160 }} />
          </Form.Item>
        </Space>

        <Form.Item label="正文内容（可拖拽排序，图片/视频/文字自由排版）">
          <ContentBlockEditor value={blocks} onChange={setBlocks} />
        </Form.Item>

        <Space size="large" wrap style={{ marginBottom: 24 }}>
          <Form.Item name="is_featured" label="首页推荐" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              style={{ width: 120 }}
              options={[
                { value: 1, label: '发布' },
                { value: 0, label: '草稿' },
              ]}
            />
          </Form.Item>
        </Space>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '更新' : '创建'}
            </Button>
            <Button onClick={() => navigate('/cases')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}