import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, List, Tag, Spin, Empty } from 'antd'
import {
  PictureOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import { dashboardAPI } from '../services/api'

export default function Dashboard() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const res: any = await dashboardAPI.getData()
      setData(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  if (!data) return <div className="dashboard-loading"><Spin /><span>正在汇总网站数据</span></div>

  const stats = data.stats
  const statItems = [
    { title: '案例', value: stats.cases, icon: <PictureOutlined />, tone: 'green' },
    { title: '视频', value: stats.videos, icon: <VideoCameraOutlined />, tone: 'blue' },
    { title: '新闻', value: stats.news, icon: <FileTextOutlined />, tone: 'gold' },
    { title: '服务', value: stats.services, icon: <AppstoreOutlined />, tone: 'violet' },
    { title: '留言', value: stats.contacts, icon: <MessageOutlined />, tone: 'cyan' },
    { title: '未读留言', value: stats.unread, icon: <MessageOutlined />, tone: 'red' },
  ]

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <span>OVERVIEW</span>
          <h1>欢迎回来，今天也一起把网站经营好。</h1>
          <p>内容、案例与客户留言都汇总在这里。</p>
        </div>
        <div className="dashboard-date">
          <strong>{new Date().getDate()}</strong>
          <span>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', weekday: 'short' })}</span>
        </div>
      </div>

      <Row gutter={[14, 14]} className="stat-grid">
        {statItems.map((item) => (
          <Col xs={12} md={8} xl={4} key={item.title}>
            <Card className={`stat-card tone-${item.tone}`}>
              <div className="stat-icon">{item.icon}</div>
              <Statistic title={item.title} value={item.value} />
              <span className="stat-caption">实时内容总量</span>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[18, 18]} className="dashboard-lists">
        <Col xs={24} xl={12}>
          <Card className="dashboard-panel" title={<span><i />最新留言</span>} extra={<a href="/contacts">查看全部 →</a>}>
            <List
              dataSource={data.latest_contacts}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无留言" /> }}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<span className="list-avatar">{item.name?.slice(0, 1) || '客'}</span>}
                    title={item.name || '访客'}
                    description={item.content?.substring(0, 50) || '未填写留言内容'}
                  />
                  {!item.is_read && <Tag color="error">未读</Tag>}
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card className="dashboard-panel" title={<span><i />最新案例</span>} extra={<a href="/cases">查看全部 →</a>}>
            <List
              dataSource={data.latest_cases}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无案例" /> }}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<span className="list-avatar is-case"><PictureOutlined /></span>}
                    title={item.title}
                    description={item.location || '暂无地点'}
                  />
                  <Tag color={item.status === 1 ? 'success' : 'default'}>
                    {item.status === 1 ? '已发布' : '草稿'}
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
