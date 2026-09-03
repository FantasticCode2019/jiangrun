import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, List, Tag, Typography } from 'antd'
import {
  PictureOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import { dashboardAPI } from '../services/api'

const { Title } = Typography

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

  if (!data) return null

  const stats = data.stats

  return (
    <div>
      <Title level={4}>仪表盘</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={4}>
          <Card>
            <Statistic title="案例" value={stats.cases} prefix={<PictureOutlined />}
              valueStyle={{ color: '#1a3c2a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="视频" value={stats.videos} prefix={<VideoCameraOutlined />}
              valueStyle={{ color: '#1a3c2a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="新闻" value={stats.news} prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1a3c2a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="服务" value={stats.services} prefix={<AppstoreOutlined />}
              valueStyle={{ color: '#1a3c2a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="留言" value={stats.contacts} prefix={<MessageOutlined />}
              valueStyle={{ color: '#c9a96e' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card>
            <Statistic title="未读留言" value={stats.unread} prefix={<MessageOutlined />}
              valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="最新留言" extra={<a href="/contacts">查看全部</a>}>
            <List
              dataSource={data.latest_contacts}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.name}
                    description={item.content?.substring(0, 50) + '...'}
                  />
                  {!item.is_read && <Tag color="red">未读</Tag>}
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="最新案例" extra={<a href="/cases">查看全部</a>}>
            <List
              dataSource={data.latest_cases}
              renderItem={(item: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.title}
                    description={item.location || '暂无地点'}
                  />
                  <Tag color={item.status === 1 ? 'green' : 'default'}>
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
