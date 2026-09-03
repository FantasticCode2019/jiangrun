import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, message, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { authAPI } from '../services/api'
import { useAuthStore } from '../store/authStore'

const { Title } = Typography

export default function Login() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true)
    try {
      const res: any = await authAPI.login(values)
      setAuth(res.data.token, res.data.user)
      message.success('登录成功')
      navigate('/dashboard')
    } catch (err: any) {
      message.error(err.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="login-orbit one" />
        <div className="login-orbit two" />
        <div className="login-brand"><span>江</span><strong>江润园林</strong></div>
        <div className="login-story">
          <span>JIANGRUN LANDSCAPE</span>
          <h1>让每一处庭院，<br />都被认真呈现。</h1>
          <p>统一管理案例、影像、资讯与客户咨询。</p>
        </div>
        <div className="login-visual-foot">BEIJING · SINCE 2005</div>
      </div>
      <div className="login-form-side">
        <Card className="login-card" bordered={false}>
        <div className="login-heading">
          <span>CONTENT STUDIO</span>
          <Title level={2}>登录管理后台</Title>
          <Typography.Text type="secondary">欢迎回来，请输入您的账号信息</Typography.Text>
        </div>
        <Form name="login" onFinish={onFinish} size="large" layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button className="login-submit" type="primary" htmlType="submit" loading={loading} block>
              登录后台
            </Button>
          </Form.Item>
        </Form>
        <Typography.Text type="secondary" className="login-hint">
		  生产环境初始密码由部署时生成；首次登录后请立即修改
        </Typography.Text>
      </Card>
      </div>
    </div>
  )
}
