/**
 * Thin API client for SuperPmAgent-web.
 * Vite dev proxies /api → http://localhost:8000.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...init,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(detail)
  }
  return res.json()
}

export interface Repo {
  name: string
  owner: string
  private: boolean
  desc: string
  updated: string
  stars: number
}

export const api = {
  auth: {
    login: (data: { pat: string; repo: string; anthropic_key: string }) =>
      request<{ ok: boolean; username: string; repo: string; profile_missing: boolean }>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify(data) },
      ),
    me: () =>
      request<{ username: string; repo: string; avatar_url: string }>('/auth/me'),
    logout: () =>
      request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
    githubAuthorize: () =>
      request<{ url: string }>('/auth/github/authorize'),
    githubRepos: () =>
      request<Repo[]>('/auth/github/repos'),
    githubComplete: (data: { repo: string; anthropic_key: string }) =>
      request<{ ok: boolean; username: string; repo: string; profile_missing: boolean }>(
        '/auth/github/complete',
        { method: 'POST', body: JSON.stringify(data) },
      ),
  },
  setup: {
    state: () =>
      request<{ completed: boolean; auto_detected_languages: Record<string, number>; answers: Record<string, unknown> | null }>('/setup/state'),
    teamProfile: () =>
      request<{
        team_name: string
        description: string
        members: { login: string; avatar_url: string }[]
        languages: Record<string, number>
        team_md_exists: boolean
      }>('/setup/team-profile'),
    finish: (data: { answers: Record<string, unknown>; auto_detected_languages?: Record<string, number> }) =>
      request<{ ok: boolean; sha: string }>('/setup/finish', { method: 'POST', body: JSON.stringify(data) }),
    updateProfile: (data: { answers: Record<string, unknown> }) =>
      request<{ ok: boolean; sha: string }>('/setup/update-profile', { method: 'POST', body: JSON.stringify(data) }),
  },
  knowledge: {
    tree: () => request('/knowledge/tree'),
    file: (path: string) => request(`/knowledge/file?path=${encodeURIComponent(path)}`),
    saveFile: (data: unknown) =>
      request('/knowledge/file', { method: 'PUT', body: JSON.stringify(data) }),
    chat: (data: unknown) =>
      request('/knowledge/session/chat', { method: 'POST', body: JSON.stringify(data) }),
  },
  goal: {
    submit: (data: unknown) =>
      request<{ id: string }>('/goal/submit', { method: 'POST', body: JSON.stringify(data) }),
    list: () => request<unknown[]>('/goal/list'),
    pause: (id: string) => request(`/goal/${id}/pause`, { method: 'POST' }),
    resume: (id: string) => request(`/goal/${id}/resume`, { method: 'POST' }),
  },
}
