import { useEffect, useState } from 'react'
import { Card, Form, Input, Button, message, Tabs, Spin } from 'antd'
import { settingAPI } from '../../services/api'

const groups = [
  { key: 'basic', label: '基本信息', fields: [
    { key: 'site_name', label: '网站名称' },
    { key: 'site_slogan', label: '网站标语' },
    { key: 'icp', label: 'ICP备案号' },
  ]},
  { key: 'contact', label: '联系方式', fields: [
    { key: 'phone', label: '电话' },
    { key: 'mobile', label: '手机' },
    { key: 'email', label: '邮箱' },
    { key: 'address', label: '地址' },
  ]},
  { key: 'social', label: '社交媒体', fields: [
    { key: 'wechat_qr', label: '微信二维码URL' },
  ]},
]

function SettingForm({ group, saving, onSave }: { group: typeof groups[0]; saving: boolean; onSave: (values: Record<string, string>) => void }) {
  const [form] = Form.useForm()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res: any = await settingAPI.get()
      const settings = res.data || {}
      const values: Record<string, string> = {}
      group.fields.forEach(f => { values[f.key] = settings[f.key] || '' })
      form.setFieldsValue(values)
    } catch (err) { /* ignore */ }
  }

  return (
    <Form form={form} layout="vertical">
      {group.fields.map(f => (
        <Form.Item key={f.key} name={f.key} label={f.label}>
          <Input />
        </Form.Item>
      ))}
      <Button type="primary" loading={saving} onClick={() => onSave(form.getFieldsValue())}>保存</Button>
    </Form>
  )
}

export default function SettingPage() {
  const [saving, setSaving] = useState(false)

  const handleSave = async (values: Record<string, string>) => {
    setSaving(true)
    try {
      await settingAPI.update(values)
      message.success('保存成功')
    } catch (err) { message.error('保存失败') } finally { setSaving(false) }
  }

  return (
    <Tabs items={groups.map((group) => ({
      key: group.key,
      label: group.label,
      children: (
        <Card>
          <SettingForm group={group} saving={saving} onSave={handleSave} />
        </Card>
      ),
    }))} />
  )
}
