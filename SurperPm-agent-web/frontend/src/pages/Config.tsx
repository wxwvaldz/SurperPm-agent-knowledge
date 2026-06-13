import { useState } from 'react'

const TABS = ['系统集成', '团队画像', '扩展提示词', '用量']

export default function Config() {
  const [tab, setTab] = useState(0)

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">系统配置</h1>

      <div className="flex border-b mb-6">
        {TABS.map((label, i) => (
          <button
            key={label}
            onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === i
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-lg p-6 min-h-[400px]">
        {tab === 0 && <IntegrationsTab />}
        {tab === 1 && <ProfileTab />}
        {tab === 2 && <ExtensionsTab />}
        {tab === 3 && <UsageTab />}
      </div>
    </div>
  )
}

function IntegrationsTab() {
  const items = [
    { name: 'GitHub', status: '✓ 已连接', color: 'text-green-600' },
    { name: 'Anthropic', status: '✓ 已连接', color: 'text-green-600' },
    { name: '豆包', status: '✗ Key 失效', color: 'text-red-600' },
    { name: 'LAP', status: '⚪ 未配置', color: 'text-gray-500' },
  ]
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.name} className="flex items-center justify-between border-b py-3">
          <div className="font-medium">{it.name}</div>
          <div className={`text-sm ${it.color}`}>{it.status}</div>
          <button className="text-sm text-blue-600 hover:underline">编辑</button>
        </div>
      ))}
    </div>
  )
}

function ProfileTab() {
  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        编辑 <code className="bg-gray-100 px-1 rounded">knowledge/profiles/team.md</code>。保存即 commit 到 fork。
      </p>
      <textarea
        className="w-full font-mono text-sm border rounded p-3"
        rows={20}
        defaultValue={'# Team Profile\n\n## Team\n- Name: ...\n\n## Tech stack\n- ...'}
      />
      <button className="mt-4 px-4 py-2 bg-gray-900 text-white rounded text-sm font-medium">
        💾 保存（commit）
      </button>
    </div>
  )
}

function ExtensionsTab() {
  const exts = [
    { target: 'skill:coding', tags: ['tdd', 'testing'], priority: 'high' },
    { target: 'skill:submit-pr', tags: ['conventional-commits'], priority: 'medium' },
  ]
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          扩展提示词（hook 注入）。新增后通过 haiku 微决策智能筛选生效。
        </p>
        <button className="px-3 py-1.5 bg-gray-900 text-white rounded text-sm">+ 新建</button>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500 border-b">
          <tr>
            <th className="text-left py-2">Target</th>
            <th className="text-left py-2">Tags</th>
            <th className="text-left py-2">Priority</th>
            <th className="text-right py-2">操作</th>
          </tr>
        </thead>
        <tbody>
          {exts.map((e) => (
            <tr key={e.target} className="border-b">
              <td className="py-3 font-mono">{e.target}</td>
              <td className="py-3">{e.tags.join(', ')}</td>
              <td className="py-3">{e.priority}</td>
              <td className="py-3 text-right">
                <button className="text-blue-600 hover:underline mr-3">编辑</button>
                <button className="text-red-600 hover:underline">删除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UsageTab() {
  return (
    <div className="space-y-4">
      <Stat label="本月 Anthropic Token" value="1,240,000" />
      <Stat label="本月豆包 Token" value="320,000" />
      <Stat label="活跃 Goal" value="3" />
      <Stat label="蒸馏 PR（待审）" value="2" />
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded p-4 flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-xl font-bold tabular-nums">{value}</span>
    </div>
  )
}
