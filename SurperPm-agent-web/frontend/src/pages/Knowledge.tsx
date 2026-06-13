import { useState } from 'react'

type Node = { name: string; path: string; isDir: boolean; children?: Node[] }

const tree: Node[] = [
  {
    name: 'profiles', path: 'knowledge/profiles', isDir: true,
    children: [{ name: 'team.md', path: 'knowledge/profiles/team.md', isDir: false }],
  },
  {
    name: 'sessions', path: 'knowledge/sessions', isDir: true,
    children: [
      { name: 'add-phone-field-20260613', path: 'knowledge/sessions/add-phone-field-20260613', isDir: true },
      { name: 'refactor-checkout-20260613', path: 'knowledge/sessions/refactor-checkout-20260613', isDir: true },
    ],
  },
  {
    name: 'domain', path: 'knowledge/domain', isDir: true,
    children: [
      { name: 'foundations', path: 'knowledge/domain/foundations', isDir: true },
      { name: 'conventions', path: 'knowledge/domain/conventions', isDir: true },
      { name: 'context', path: 'knowledge/domain/context', isDir: true },
    ],
  },
  {
    name: 'extensions', path: 'knowledge/extensions', isDir: true,
    children: [],
  },
]

export default function Knowledge() {
  const [selected, setSelected] = useState<string>('knowledge/sessions/add-phone-field-20260613')
  const isSession = selected.startsWith('knowledge/sessions/') && selected.split('/').length >= 3

  return (
    <div className="grid grid-cols-12 h-[calc(100vh-57px)]">
      {/* Left: tree */}
      <aside className="col-span-3 border-r bg-white overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">📁 knowledge/</h2>
          <button className="text-xs text-blue-600 hover:underline">+ 新建会话</button>
        </div>
        <Tree nodes={tree} selected={selected} onSelect={setSelected} depth={0} />
      </aside>

      {/* Middle: file preview / editor */}
      <main className={`${isSession ? 'col-span-5' : 'col-span-9'} bg-gray-50 overflow-hidden flex flex-col`}>
        {isSession ? <SessionTabs path={selected} /> : <FileEditor path={selected} />}
      </main>

      {/* Right: chat (only sessions) */}
      {isSession && (
        <aside className="col-span-4 border-l bg-white flex flex-col">
          <SessionChat path={selected} />
        </aside>
      )}
    </div>
  )
}

function Tree({
  nodes,
  selected,
  onSelect,
  depth,
}: {
  nodes: Node[]
  selected: string
  onSelect: (path: string) => void
  depth: number
}) {
  return (
    <ul>
      {nodes.map((n) => (
        <li key={n.path}>
          <button
            onClick={() => onSelect(n.path)}
            className={`w-full text-left text-sm px-2 py-1 rounded hover:bg-gray-100 ${
              selected === n.path ? 'bg-gray-900 text-white hover:bg-gray-900' : ''
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {n.isDir ? '▸ ' : '  '}
            {n.name}
          </button>
          {n.children && n.children.length > 0 && (
            <Tree nodes={n.children} selected={selected} onSelect={onSelect} depth={depth + 1} />
          )}
        </li>
      ))}
    </ul>
  )
}

function FileEditor({ path }: { path: string }) {
  return (
    <div className="p-6 flex-1 flex flex-col">
      <div className="text-xs text-gray-500 mb-2 font-mono">{path}</div>
      <h1 className="text-lg font-semibold mb-4">文件预览</h1>
      <textarea
        className="flex-1 border rounded p-3 font-mono text-sm bg-white"
        defaultValue="# Markdown content here\n\n(选择 sessions/<name>/ 会进入对话视图)"
      />
      <button className="mt-4 self-start px-4 py-2 bg-gray-900 text-white rounded text-sm">
        💾 保存（commit）
      </button>
    </div>
  )
}

function SessionTabs({ path }: { path: string }) {
  const [tab, setTab] = useState('conversation.md')
  const tabs = ['conversation.md', 'notes.md', 'decisions.md', 'attachments/']
  return (
    <>
      <div className="border-b bg-white px-4">
        <div className="text-xs text-gray-500 font-mono py-2">{path}</div>
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px ${
                tab === t ? 'border-gray-900' : 'border-transparent text-gray-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 p-6 bg-white overflow-auto">
        <pre className="font-mono text-sm whitespace-pre-wrap">
{`# add phone field

PM: 给 user 表加 phone 字段。
AI: 涉及哪几张表？需要校验格式吗（E.164）？
PM: ...
`}
        </pre>
      </div>
    </>
  )
}

function SessionChat({ path }: { path: string }) {
  return (
    <>
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">💬 会话 chat</h3>
        <div className="text-xs text-gray-500 mt-1">
          上下文：本 session + profiles + domain + extensions
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-3">
        <Bubble who="PM">给 user 表加 phone 字段</Bubble>
        <Bubble who="AI">涉及 user / user_audit / 还有 mobile_verifications？</Bubble>
        <Bubble who="PM">前两张</Bubble>
      </div>
      <div className="border-t p-3">
        <textarea
          rows={3}
          placeholder="输入..."
          className="w-full border rounded p-2 text-sm resize-none"
        />
        <div className="flex justify-end mt-2">
          <button className="px-4 py-1.5 bg-gray-900 text-white rounded text-sm">发送</button>
        </div>
      </div>
    </>
  )
}

function Bubble({ who, children }: { who: 'PM' | 'AI'; children: React.ReactNode }) {
  const isPM = who === 'PM'
  return (
    <div className={`flex ${isPM ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
          isPM ? 'bg-gray-900 text-white' : 'bg-gray-100'
        }`}
      >
        <div className="text-xs opacity-70 mb-1">{who}</div>
        {children}
      </div>
    </div>
  )
}
