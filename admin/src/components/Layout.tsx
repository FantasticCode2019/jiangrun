import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Dropdown, Avatar } from 'antd'
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
  LinkOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'

const { Header, Sider, Content } = Layout
const websiteUrl = import.meta.env.VITE_SITE_URL || 'https://jiangrun.net'

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
  const currentItem = menuItems.find((item) => location.pathname.startsWith(item.key))

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
    <Layout className="admin-shell">
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark" width={240} collapsedWidth={76}
        className="admin-sider">
        <div className={`admin-brand ${collapsed ? 'is-collapsed' : ''}`}>
          <div className="admin-brand-mark">江</div>
          {!collapsed && (
            <div className="admin-brand-copy">
              <strong>江润园林</strong>
              <span>CONTENT STUDIO</span>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          className="admin-menu"
          selectedKeys={[currentItem?.key || location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
        {!collapsed && <div className="admin-sider-foot">JR · 2005</div>}
      </Sider>
      <Layout className="admin-main" style={{ marginLeft: collapsed ? 76 : 240 }}>
        <Header className="admin-topbar">
          <div className="admin-topbar-left">
            <Button type="text" className="collapse-button"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)} />
            <div className="admin-page-heading">
              <span>网站内容管理</span>
              <strong>{currentItem?.label || '江润园林'}</strong>
            </div>
          </div>
          <div className="admin-actions">
            <a className="site-preview" href={websiteUrl} target="_blank" rel="noreferrer">
              <LinkOutlined />
              <span>查看网站</span>
            </a>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div className="admin-user">
              <Avatar icon={<UserOutlined />} className="admin-avatar" />
              <div>
                <strong>{user?.username || '管理员'}</strong>
                <span>超级管理员</span>
              </div>
            </div>
          </Dropdown>
          </div>
        </Header>
        <Content className="admin-content">
          <div className="admin-content-card">{children}</div>
        </Content>
      </Layout>
    </Layout>
  )
}
