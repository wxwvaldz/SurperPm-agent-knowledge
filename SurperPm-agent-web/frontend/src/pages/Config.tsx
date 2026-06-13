import { useState } from 'react'

const TABS = ['集成', '用量']

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
        {tab === 1 && <UsageTab />}
      </div>
    </div>
  )
}

const ITEMS = [
  { name: 'GitHub PAT', endpoint: 'https://api.github.com', key: '••••••••', status: '✓' },
  { name: '模型 endpoint', endpoint: 'https://api.anthropic.com', key: '', status: '⚪' },
  { name: 'LAP', endpoint: '', key: '', status: '⚪' },
]

function IntegrationsTab() {
  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        所有 endpoint + key。条目跟随仓库的 <code className="bg-gray-100 px-1 rounded">.SuperPmAgent.toml</code> 模板配置。模型 endpoint 不绑定具体厂商。
      </p>
      <table className="w-full text-sm">
        <thead className="text-xs text-gray-500 border-b">
          <tr>
            <th className="text-left py-2 w-32">服务</th>
            <th className="text-left py-2">Endpoint</th>
            <th className="text-left py-2">Key</th>
            <th className="text-center py-2 w-12">状态</th>
            <th className="text-right py-2 w-20">操作</th>
          </tr>
        </thead>
        <tbody>
          {ITEMS.map((it) => (
            <tr key={it.name} className="border-b">
              <td className="py-3 font-medium">{it.name}</td>
              <td className="py-3 font-mono text-xs">{it.endpoint || <span className="text-gray-400">(未配置)</span>}</td>
              <td className="py-3 font-mono text-xs">{it.key || <span className="text-gray-400">(未配置)</span>}</td>
              <td className="py-3 text-center">{it.status}</td>
              <td className="py-3 text-right">
                <button className="text-blue-600 hover:underline text-xs">编辑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="mt-4 px-3 py-1.5 border rounded text-sm">+ 新增服务</button>
    </div>
  )
}

function UsageTab() {
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-2">
        本月用量。占位数据,真实数据 W2 接通后展示。
      </div>
      <Stat label="模型 Token (in)" value="1,240,000" />
      <Stat label="模型 Token (out)" value="320,000" />
      <Stat label="活跃 Goal" value="3" />
      <Stat label="蒸馏 PR(待审)" value="2" />
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
