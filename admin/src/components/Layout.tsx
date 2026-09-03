import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Avatar, theme } from 'antd'
import {
  DashboardOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  TagsOutlined,
  SettingOutlined,
  MessageOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'

const { Header, Sider, Content } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/cases', icon: <PictureOutlined />, label: '案例管理' },
  { key: '/videos', icon: <VideoCameraOutlined />, label: '视频管理' },
  { key: '/news', icon: <FileTextOutlined />, label: '新闻管理' },
  { key: '/services', icon: <AppstoreOutlined />, label: '服务管理' },
  { key: '/categories', icon: <TagsOutlined />, label: '分类管理' },
  { key: '/banners', icon: <PictureOutlined />, label: '轮播图管理' },
  { key: '/contacts', icon: <MessageOutlined />, label: '留言管理' },
  { key: '/settings', icon: <SettingOutlined />, label: '网站设置' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken()

  const handleMenuClick = (info: { key: string }) => {
    navigate(info.key)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ]

  return (
    <Layout style={{ height: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark"
        style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0 }}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ color: '#fff', margin: 0, fontSize: collapsed ? 14 : 18, whiteSpace: 'nowrap' }}>
            {collapsed ? '江润' : '江润园林管理'}
          </h1>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'margin-left 0.2s' }}>
        <Header style={{
          padding: '0 24px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: 16 }}
          />
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1a3c2a' }} />
              <span>{user?.username || '管理员'}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{
          margin: 24,
          padding: 24,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          overflow: 'auto',
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
