import { useState } from 'react'

const STEPS = [
  { key: 'github', label: 'GitHub 登录' },
  { key: 'fork', label: 'Fork 仓库' },
  { key: 'profile', label: '团队画像' },
  { key: 'keys', label: '连接服务' },
  { key: 'interview', label: '冷启动访谈' },
  { key: 'done', label: '完成' },
]

export default function Setup() {
  const [step, setStep] = useState(0)

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-2">SuperPmAgent 初始化</h1>
      <p className="text-gray-600 mb-8 text-sm">
        一次性配置你的 fork 仓库 + 系统集成 + 团队画像。约 10-20 分钟。
      </p>

      {/* progress */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex-1 flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                i < step
                  ? 'bg-green-500 text-white'
                  : i === step
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <div className="ml-2 text-xs flex-1">
              <div className={i === step ? 'font-semibold' : 'text-gray-500'}>
                {s.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* current step body */}
      <div className="bg-white border rounded-lg p-8 min-h-[300px]">
        {step === 0 && <StepGitHub />}
        {step === 1 && <StepFork />}
        {step === 2 && <StepProfile />}
        {step === 3 && <StepKeys />}
        {step === 4 && <StepInterview />}
        {step === 5 && <StepDone />}
      </div>

      <div className="flex justify-between mt-6">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-4 py-2 border rounded-md text-sm font-medium disabled:opacity-40"
        >
          ← 上一步
        </button>
        <button
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
          className="px-6 py-2 bg-gray-900 text-white rounded-md text-sm font-medium disabled:opacity-40"
        >
          {step === STEPS.length - 2 ? '完成' : '下一步 →'}
        </button>
      </div>
    </div>
  )
}

function StepGitHub() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">连接 GitHub 账号</h2>
      <p className="text-gray-600 text-sm mb-6">
        我们用你的 GitHub 账号登录，然后把官方模板仓库 fork 到你的账号下。
      </p>
      <button className="px-6 py-3 bg-gray-900 text-white rounded-md font-medium">
        🔗 用 GitHub 登录
      </button>
    </div>
  )
}

function StepFork() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Fork claude-for-SuperPmAgent</h2>
      <p className="text-gray-600 text-sm mb-6">
        Fork 是你团队的私有副本。AI 蒸馏出的 skill / knowledge 会 PR 到这里。
      </p>
      <div className="border rounded p-4 bg-gray-50">
        <div className="text-xs text-gray-500">来源</div>
        <div className="font-mono text-sm">github.com/SuperPmAgent/claude-for-SuperPmAgent</div>
        <div className="text-xs text-gray-500 mt-3">Fork 到</div>
        <input
          className="w-full font-mono text-sm border rounded px-3 py-2"
          defaultValue="<your-org>/claude-for-SuperPmAgent"
        />
      </div>
    </div>
  )
}

function StepProfile() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">团队基础画像</h2>
      <p className="text-gray-600 text-sm mb-6">
        这些信息会写到 fork 的 <code className="bg-gray-100 px-1 rounded">knowledge/profiles/team.md</code>。
      </p>
      <div className="space-y-4">
        <Field label="团队名称" placeholder="例：AI Coding 小组" />
        <Field label="技术栈" placeholder="React + Node.js + PostgreSQL" />
        <Field label="代码托管" placeholder="GitHub Enterprise / GitLab" />
        <Field label="部署方式" placeholder="Kubernetes / Docker / VPS" />
      </div>
    </div>
  )
}

function StepKeys() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">连接服务</h2>
      <div className="space-y-4">
        <Field label="Anthropic API Key" placeholder="sk-ant-..." type="password" />
        <Field label="豆包 API Key" placeholder="ark-..." type="password" />
        <Field label="GitHub Personal Access Token" placeholder="ghp_..." type="password" />
        <Field label="LAP URL（可选）" placeholder="https://lap.example.com" />
      </div>
    </div>
  )
}

function StepInterview() {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">冷启动访谈</h2>
      <p className="text-gray-600 text-sm mb-6">
        下面 10 题。AI 会用这些回答 + 你的代码仓库示例文件，写出团队 profile。
      </p>
      <div className="border-l-2 border-gray-900 pl-4 mb-4">
        <div className="text-xs text-gray-500 mb-1">问题 1 / 10</div>
        <div className="font-medium">你们写新代码时，是先写测试还是后补测试？</div>
      </div>
      <textarea
        className="w-full border rounded px-3 py-2 text-sm"
        rows={3}
        placeholder="你的回答..."
      />
    </div>
  )
}

function StepDone() {
  return (
    <div className="text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-lg font-semibold mb-4">完成</h2>
      <p className="text-gray-600 text-sm mb-6">
        Fork 里已写入团队 profile。在终端运行下面命令安装 plugin：
      </p>
      <pre className="bg-gray-900 text-green-300 px-4 py-3 rounded font-mono text-sm inline-block text-left">
        /plugin marketplace add github.com/&lt;your-org&gt;/claude-for-SuperPmAgent
      </pre>
    </div>
  )
}

function Field({ label, placeholder, type = 'text' }: { label: string; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        className="w-full border rounded px-3 py-2 text-sm"
        placeholder={placeholder}
      />
    </div>
  )
}
