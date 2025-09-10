import { useState } from 'react'
import { API_BASE } from '../lib/api.js'

export default function UpdateApiKeySection() {
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onSave = async () => {
    setError('')
    setSuccess('')
    if (!apiKey.trim()) {
      setError('API key is required')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/rag/updateAPIKey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ llmApiKey: apiKey.trim() })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Failed to update API key')
        return
      }
      setSuccess('API key updated successfully')
      setApiKey('')
    } catch (e) {
      console.error('updateApiKey error', e)
      setError('Failed to update API key')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium text-gray-900">Update LLM API Key</h3>
      <p className="text-sm text-gray-600">Provide your API key used by the embedding/generation services.</p>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Enter API key"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : 'Save API Key'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {success && <p className="mt-2 text-sm text-green-600">{success}</p>}
    </div>
  )
}
