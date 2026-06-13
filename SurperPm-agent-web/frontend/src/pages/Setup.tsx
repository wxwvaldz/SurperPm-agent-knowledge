import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const QUESTIONS = [
  '你日常负责的工作类型?(产品 / 工程 / 数据 / ...)',
  '你最常用的开发语言 / 框架?',
  '你们团队的代码评审风格?(严格 / 轻量 / 快速合并)',
  '遇到不确定的需求时,你倾向于先问还是先做?',
  '你写代码时是先写测试还是后补测试?',
]

export default function Setup() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<'overview' | 'interview' | 'done'>('overview')
  const [idx, setIdx] = useState(0)
  const [answers, setAnswers] = useState<string[]>(Array(QUESTIONS.length).fill(''))

  if (phase === 'overview') {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold mb-2">欢迎</h1>
        <p className="text-sm text-gray-600 mb-6">
          已登录到团队仓库。下面是从 <code className="bg-gray-100 px-1 rounded">knowledge/profiles/team.md</code> 自动解析出的团队画像:
        </p>
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h2 className="font-semibold mb-2">AI Coding 小组</h2>
          <p className="text-sm text-gray-600">
            后端为主的 8 人小队,主用 Python + TypeScript。(mock data — 真实数据 W2 接通后从 GitHub API 读取)
          </p>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          你的个人画像还没填。下面 5 题,2 分钟搞定:
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setPhase('interview')}
            className="px-6 py-2 bg-gray-900 text-white rounded font-medium text-sm"
          >
            开始访谈 →
          </button>
          <button
            onClick={() => navigate('/goal')}
            className="px-6 py-2 border rounded font-medium text-sm text-gray-600"
          >
            稍后再说
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'interview') {
    const q = QUESTIONS[idx]
    const a = answers[idx]
    const canNext = a.trim().length > 0
    const isLast = idx === QUESTIONS.length - 1
    return (
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-xl font-bold mb-2">个人画像访谈</h1>
        <div className="text-xs text-gray-500 mb-6">问题 {idx + 1} / {QUESTIONS.length}</div>
        <div className="bg-white border rounded-lg p-6 mb-6">
          <div className="font-medium mb-4">{q}</div>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            rows={4}
            value={a}
            onChange={(e) => {
              const next = [...answers]
              next[idx] = e.target.value
              setAnswers(next)
            }}
            placeholder="..."
          />
        </div>
        <div className="flex justify-between">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="px-4 py-2 border rounded text-sm disabled:opacity-40"
          >
            ← 上一题
          </button>
          {isLast ? (
            <button
              onClick={() => setPhase('done')}
              disabled={!canNext}
              className="px-6 py-2 bg-gray-900 text-white rounded font-medium text-sm disabled:opacity-40"
            >
              完成
            </button>
          ) : (
            <button
              onClick={() => setIdx((i) => i + 1)}
              disabled={!canNext}
              className="px-6 py-2 bg-gray-900 text-white rounded font-medium text-sm disabled:opacity-40"
            >
              下一题 →
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-8 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h1 className="text-2xl font-bold mb-2">完成</h1>
      <p className="text-sm text-gray-600 mb-6">
        你的个人画像已写入 <code className="bg-gray-100 px-1 rounded">knowledge/profiles/&lt;your-username&gt;.md</code> 并 commit 到 fork。
      </p>
      <button
        onClick={() => navigate('/goal')}
        className="px-6 py-2 bg-gray-900 text-white rounded font-medium text-sm"
      >
        进入 Goal 控制台 →
      </button>
    </div>
  )
}
