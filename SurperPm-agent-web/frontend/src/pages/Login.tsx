import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [pat, setPat] = useState('')
  const [repo, setRepo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      // W1 末 mock — real call goes via api.auth.login in W2
      // const r = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ pat, repo }),
      //   credentials: 'include',
      // })
      // if (!r.ok) throw new Error(await r.text())
      // const { profile_missing } = await r.json()
      // navigate(profile_missing ? '/setup' : '/goal')

      await new Promise((r) => setTimeout(r, 400))
      navigate('/setup')
    } catch {
      setError('登录失败,检查 PAT 和仓库地址')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white border rounded-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-2">⚡ SuperPmAgent</h1>
        <p className="text-sm text-gray-600 mb-6">
          用 GitHub PAT 登录。无注册,凭你对仓库的访问权限。
        </p>
        <div className="space-y-4">
          <Field label="团队仓库地址" placeholder="myorg/claude-for-SuperPmAgent-fork" value={repo} onChange={setRepo} mono />
          <Field
            label="GitHub Personal Access Token"
            placeholder="ghp_..."
            value={pat}
            onChange={setPat}
            type="password"
            mono
            hint={<>需要 repo 读权限。<a className="text-blue-600 underline" href="https://github.com/settings/tokens" target="_blank" rel="noreferrer">如何创建</a></>}
          />
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">
              {error}
            </div>
          )}
          <button
            onClick={handleLogin}
            disabled={loading || !pat || !repo}
            className="w-full px-4 py-2 bg-gray-900 text-white rounded font-medium text-sm disabled:opacity-50"
          >
            {loading ? '验证中…' : '登录'}
          </button>
        </div>
        <div className="mt-6 pt-6 border-t text-xs text-gray-500">
          <strong>没有账号?</strong> SuperPmAgent 不做注册。能 clone 仓库 = 能登录。
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  mono = false,
  hint,
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  type?: string
  mono?: boolean
  hint?: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        className={`w-full border rounded px-3 py-2 text-sm ${mono ? 'font-mono' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </div>
  )
}
