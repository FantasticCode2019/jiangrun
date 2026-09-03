import { useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Button, Input, Upload, message, Space, Progress } from 'antd'
import {
  DeleteOutlined,
  HolderOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FontSizeOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { uploadAPI } from '../services/api'

export type CaseBlock = {
  type: 'image' | 'video' | 'text'
  src?: string
  caption?: string
  text?: string
  align?: 'left' | 'center'
}

type Props = {
  value?: CaseBlock[]
  onChange: (blocks: CaseBlock[]) => void
}

type SortableItemProps = {
  id: string
  index: number
  block: CaseBlock
  onUpdate: (index: number, patch: Partial<CaseBlock>) => void
  onRemove: (index: number) => void
}

function SortableBlock({ id, index, block, onUpdate, onRemove }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const [progress, setProgress] = useState<number | null>(null)

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // 图片：大文件也走断点续传
  const uploadImage = async (file: any) => {
    setProgress(0)
    try {
      const url = await uploadAPI.chunkUpload(file, 'images', setProgress)
      onUpdate(index, { src: url })
      message.success('上传成功')
    } catch (e: any) {
      message.error('上传失败，可稍后重试续传')
    } finally {
      setProgress(null)
    }
    return false
  }

  const uploadVideo = async (file: any) => {
    setProgress(0)
    try {
      const url = await uploadAPI.chunkUpload(file, 'videos', setProgress)
      onUpdate(index, { src: url })
      message.success('视频上传成功')
    } catch (e: any) {
      message.error('视频上传失败，可稍后重试续传')
    } finally {
      setProgress(null)
    }
    return false
  }

  return (
    <div
      ref={setNodeRef}
      style={{ border: '1px solid #e0e0e0', borderRadius: 6, marginBottom: 12, background: '#fafafa', ...style }}
    >
      {/* 表头：拖拽手柄 + 类型 + 删除 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderBottom: '1px solid #eee',
        }}
      >
        <span {...attributes} {...listeners} style={{ cursor: 'grab', color: '#999', fontSize: 16 }} title="拖动排序">
          <HolderOutlined />
        </span>
        <span style={{ color: '#555', fontSize: 13 }}>
          {block.type === 'image' ? '🖼️ 图片' : block.type === 'video' ? '🎬 视频' : '✍️ 文字'}
        </span>
        <span style={{ flex: 1 }} />
        <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => onRemove(index)} />
      </div>

      {/* 内容区 */}
      <div style={{ padding: 12 }}>
        {block.type === 'image' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Upload showUploadList={false} beforeUpload={uploadImage} accept="image/*">
                <Button icon={<UploadOutlined />} disabled={progress !== null}>上传图片（大图断点续传）</Button>
              </Upload>
              {progress !== null && (
                <Progress percent={progress} size="small" style={{ width: 300 }} />
              )}
              <Input
                placeholder="或粘贴图片URL"
                value={block.src}
                style={{ width: 300 }}
                onChange={(e) => onUpdate(index, { src: e.target.value })}
              />
              <Input
                placeholder="图片说明（可选）"
                value={block.caption}
                style={{ width: 300 }}
                onChange={(e) => onUpdate(index, { caption: e.target.value })}
              />
            </div>
            {block.src && (
              <img src={block.src} alt="" style={{ maxWidth: 180, maxHeight: 120, objectFit: 'cover', border: '1px solid #eee' }} />
            )}
          </div>
        )}

        {block.type === 'video' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Space>
              <Upload showUploadList={false} beforeUpload={uploadVideo} accept="video/*">
                <Button icon={<UploadOutlined />} disabled={progress !== null}>
                  本地上传视频（大文件断点续传）
                </Button>
              </Upload>
              <Input placeholder="或填写视频URL（mp4 等）" value={block.src} style={{ width: 380 }}
                onChange={(e) => onUpdate(index, { src: e.target.value })} />
            </Space>
            {progress !== null && <Progress percent={progress} />}
            <Input placeholder="视频说明（可选）" value={block.caption} style={{ width: 420 }}
              onChange={(e) => onUpdate(index, { caption: e.target.value })} />
            {block.src && (
              <video src={block.src} controls style={{ maxWidth: 300, maxHeight: 160, border: '1px solid #eee' }} />
            )}
          </div>
        )}

        {block.type === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Input.TextArea
              rows={4}
              placeholder="段落文字（支持换行；可包含少量HTML）"
              value={block.text}
              onChange={(e) => onUpdate(index, { text: e.target.value })}
            />
            <Space>
              <span style={{ color: '#888', fontSize: 12 }}>对齐：</span>
              <Button size="small" type={block.align !== 'center' ? 'primary' : 'default'} onClick={() => onUpdate(index, { align: 'left' })}>
                左对齐
              </Button>
              <Button size="small" type={block.align === 'center' ? 'primary' : 'default'} onClick={() => onUpdate(index, { align: 'center' })}>
                居中
              </Button>
            </Space>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ContentBlockEditor({ value = [], onChange }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const items = useMemo(() => value.map((_, i) => String(i)), [value])

  const handleDragEnd = (e: any) => {
    const { active, over } = e
    if (active.id !== over?.id) {
      onChange(arrayMove(value, Number(active.id), Number(over.id)))
    }
  }

  const add = (type: CaseBlock['type']) => {
    onChange([...value, type === 'text' ? { type, align: 'left' } : ({ type } as CaseBlock)])
  }

  const update = (index: number, patch: Partial<CaseBlock>) => {
    onChange(value.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  }

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div>
      {value.length === 0 && (
        <div style={{ textAlign: 'center', color: '#999', border: '1px dashed #ccc', borderRadius: 6, padding: 20, marginBottom: 12 }}>
          还没有内容，点击下方按钮添加 图片 / 视频 / 文字
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div>
            {value.map((block, i) => (
              <SortableBlock key={String(i)} id={String(i)} index={i} block={block} onUpdate={update} onRemove={remove} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <Button.Group style={{ marginTop: 4 }}>
        <Button icon={<PictureOutlined />} onClick={() => add('image')}>图片</Button>
        <Button icon={<VideoCameraOutlined />} onClick={() => add('video')}>视频</Button>
        <Button icon={<FontSizeOutlined />} onClick={() => add('text')}>文字段落</Button>
      </Button.Group>
    </div>
  )
}