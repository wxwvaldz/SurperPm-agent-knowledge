/**
 * Thin API client. All endpoints are stubs that the backend will fill in W2.
 * Vite dev proxies /api → http://localhost:8000.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

export const api = {
  setup: {
    state: () => request<{ completed: boolean; step: number }>('/setup/state'),
    saveStep: (data: unknown) =>
      request('/setup/save-step', { method: 'POST', body: JSON.stringify(data) }),
    finish: () => request<{ ok: boolean; cli: string }>('/setup/finish', { method: 'POST' }),
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
