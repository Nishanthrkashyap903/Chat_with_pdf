import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatSidebar from '../components/ChatSidebar.jsx'
import UpdateApiKeySection from '../components/UpdateApiKeySection.jsx'
import UploadSection from '../components/UploadSection.jsx'
import { API_BASE } from '../lib/api.js'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [threadsInfo, setThreadsInfo] = useState([])
  const [threadsLoading, setThreadsLoading] = useState(false)
  const [threadsError, setThreadsError] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const navigate = useNavigate()

  const loadProfile = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, { credentials: 'include' })
      if (!res.ok) {
        navigate('/signin', { replace: true })
        return
      }
      const data = await res.json().catch(() => ({}))
      setUser(data?.user || null)
    } catch (e) {
      console.error('Load profile error', e)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const loadThreads = async () => {
    setThreadsLoading(true)
    setThreadsError('')
    try {
      const res = await fetch(`${API_BASE}/rag/threads`, { credentials: 'include' })
      if (res.status === 401) {
        navigate('/signin', { replace: true })
        return
      }
      if (!res.ok) {
        throw new Error('Failed to load threads')
      }
      const data = await res.json().catch(() => ({ threadInfo: [] }))
      setThreadsInfo(Array.isArray(data.threadInfo) ? data.threadInfo : [])
    } catch (e) {
      console.error('Load threads error', e)
      setThreadsError('Failed to load chat history')
    } finally {
      setThreadsLoading(false)
    }
  }

  const onFilesChange = (e) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(files)
  }

  // ===== Helpers for readability =====
  const handleUnauthorized = (res) => {
    if (res.status === 401) {
      navigate('/signin', { replace: true })
      return true
    }
    return false
  }

  const safeJson = async (res, fallback = {}) => {
    try { return await res.json() } catch { return fallback }
  }

  const buildFormDataFromFiles = (files) => {
    const fd = new FormData()
    files.forEach(f => fd.append('files', f)) // field name 'files' per backend
    return fd
  }

  const uploadSelectedFiles = async () => {
    const fd = buildFormDataFromFiles(selectedFiles)
    const upRes = await fetch(`${API_BASE}/upload/multiple`, {
      method: 'POST',
      body: fd,
      credentials: 'include'
    })
    if (handleUnauthorized(upRes)) return null
    if (!upRes.ok) throw new Error('Upload failed')
    const upData = await safeJson(upRes, { files: [] })
    return upData.files || []
  }

  const extractPdfPaths = (files) => files.map(f => f.path).filter(Boolean)

  const createThreadFromPaths = async (pdfPaths) => {
    const genRes = await fetch(`${API_BASE}/rag/generateThreadIdAndEmbeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pdfPaths })
    })
    if (handleUnauthorized(genRes)) return { threadId: null, error: 'Unauthorized' }
    const genData = await safeJson(genRes, {})
    if (genRes.status === 400) {
      // Surface backend error like: {"error":"No API key found for this user or user not found"}
      return { threadId: null, error: genData?.error || 'Bad request' }
    }
    if (!genRes.ok) {
      return { threadId: null, error: 'Failed to create thread' }
    }
    return { threadId: genData?.threadId || null, error: null }
  }

  const navigateToThread = (threadId) => navigate(`/c/${threadId}`)

  const handleUploadClick = async () => {
    if (!selectedFiles.length) return
    setUploadError('')
    setUploading(true)
    try {
      const uploaded = await uploadSelectedFiles()
      if (!uploaded) return
      const pdfPaths = extractPdfPaths(uploaded)
      if (!pdfPaths.length) throw new Error('No file paths returned')
      const { threadId, error } = await createThreadFromPaths(pdfPaths)
      if (error) {
        setUploadError(error)
        return
      }
      if (!threadId) throw new Error('No threadId returned')
      await loadThreads()
      navigateToThread(threadId)
    } catch (e) {
      console.error('Upload flow error', e)
      setUploadError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onLogout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' })
    } catch (e) {
      console.error('Logout error', e)
    } finally {
      navigate('/signin', { replace: true })
    }
  }

  useEffect(() => {
    loadProfile()
    loadThreads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4 md:p-6">
      <div className="h-[calc(100vh-2rem)] max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
        {/* Sidebar: Chat threads */}
        <div className="w-full md:w-80 flex-shrink-0">
          <div className="bg-gradient-to-b from-white to-indigo-50 rounded-2xl shadow-md border border-indigo-100 h-full flex flex-col overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
              <h2 className="text-xl font-bold">Chat History</h2>
              <p className="text-indigo-100 text-sm">Your recent conversations</p>
            </div>
            <ChatSidebar
              threadsInfo={threadsInfo}
              loading={threadsLoading}
              error={threadsError}
              onRefresh={loadThreads}
              onSelect={(tid) => navigate(`/c/${tid}`)}
            />
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 flex flex-col bg-white rounded-2xl shadow-md border border-indigo-100 overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Welcome back{user?.username ? `, ${user.username}` : ''}!</h1>
                <p className="text-indigo-100">Upload and chat with your PDF documents</p>
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-all duration-200 flex items-center gap-2 self-start shadow-md hover:shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                Sign out
              </button>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center space-y-4">
                  <div className="h-16 w-16 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full animate-bounce"></div>
                  <p className="text-indigo-600 font-medium">Loading your dashboard...</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <UpdateApiKeySection />

                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-indigo-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Upload Documents</h2>
                  </div>
                  <UploadSection
                    selectedFiles={selectedFiles}
                    uploading={uploading}
                    onFilesChange={onFilesChange}
                    onUpload={handleUploadClick}
                    errorMessage={uploadError}
                  />
                </div>

              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
