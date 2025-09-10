import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from "react-markdown";
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { API_BASE } from '../lib/api.js';

export default function ChatThread() {
    const { threadId } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [items, setItems] = useState([])
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const [composerError, setComposerError] = useState('')
    const endRef = useRef(null)

    const loadChat = async () => {
        if (!threadId) return
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`${API_BASE}/rag/getChatHistory`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ threadId })
            })
            if (res.status === 401) {
                navigate('/signin', { replace: true })
                return
            }
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data?.error || 'Failed to load chat history')
            }
            const data = await res.json()
            const list = Array.isArray(data?.chatHistory) ? data.chatHistory : []
            setItems(list)
        } catch (e) {
            console.error('loadChat error', e)
            setError(e.message || 'Failed to load chat history')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadChat()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [threadId])

    // Auto scroll to bottom on messages change
    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [items])

    const handleAsk = async (e) => {
        e?.preventDefault()
        const question = input.trim()
        if (!question || sending) return
        setComposerError('')
        setSending(true)
        try {
            const res = await fetch(`${API_BASE}/rag/generateAnswersFromQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ threadId, query: question })
            })
            if (res.status === 401) {
                navigate('/signin', { replace: true })
                return
            }
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setComposerError(data?.error || 'Failed to send message')
                return
            }
            setInput('')
            // Refresh chat history to include the new Q&A
            await loadChat()
        } catch (err) {
            console.error('ask error', err)
            setComposerError('Failed to send message')
        } finally {
            setSending(false)
        }
    }

    const chatMessages = items.flatMap((it) => ([
        { id: `${it._id}-q`, role: 'user', content: it.question },
        { id: `${it._id}-a`, role: 'assistant', content: it.answer },
    ]))

    return (
        <div className="min-h-screen w-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            <div className="max-w-4xl mx-auto flex flex-col h-screen">
                <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-indigo-100 shadow-sm">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <Link to="/dashboard" className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Back to Dashboard
                            </Link>
                            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Chat with your documents</h1>
                        </div>
                        <button
                            onClick={loadChat}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Refresh
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto py-4">
                    <div className="px-4">
                        {loading ? (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-pulse flex flex-col items-center">
                                    <div className="h-12 w-12 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full animate-bounce"></div>
                                    <p className="mt-3 text-indigo-600 font-medium">Loading conversation...</p>
                                </div>
                            </div>
                        ) : error ? (
                            <div className="max-w-2xl mx-auto p-4 bg-red-50 border-l-4 border-red-500 rounded-r">
                                <div className="flex items-center gap-2 text-red-700">
                                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <p className="font-medium">Error loading messages</p>
                                </div>
                                <p className="mt-1 text-sm text-red-600">{error}</p>
                                <button
                                    onClick={loadChat}
                                    className="mt-3 px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                                >
                                    Retry
                                </button>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="max-w-2xl mx-auto p-8 text-center">
                                <div className="mx-auto h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">Start a conversation</h3>
                                <p className="text-gray-500">Ask a question about your documents to get started</p>
                            </div>
                        ) : (
                            <div className="mx-auto max-w-3xl space-y-6 px-2">
                                {chatMessages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} max-w-[90%]`}>
                                            {/* Avatar */}
                                            <div className={`h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold ${msg.role === 'user' ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md'}`}>
                                                {msg.role === 'user' ? 'U' : 'AI'}
                                            </div>
                                            {/* Bubble */}
                                            <div className={`rounded-2xl px-4 py-3 whitespace-pre-wrap leading-relaxed ${msg.role === 'user'
                                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                                                : 'bg-white text-gray-800 border border-gray-100 shadow-sm'}`}>
                                                <ReactMarkdown
                                                    components={{
                                                        code({ className, children, ...props }) {
                                                            const match = /language-(\w+)/.exec(className || "");
                                                            return match ? (
                                                                <SyntaxHighlighter
                                                                    style={oneDark}
                                                                    language={match[1]}
                                                                    PreTag="div"
                                                                    {...props}
                                                                    className="rounded-lg my-2 text-sm"
                                                                >
                                                                    {String(children).replace(/\n$/, "")}
                                                                </SyntaxHighlighter>
                                                            ) : (
                                                                <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm" {...props}>{children}</code>
                                                            );
                                                        },
                                                        p: (props) => <p className="mb-3 last:mb-0" {...props} />,
                                                        a: (props) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                                        ul: (props) => <ul className="list-disc pl-5 space-y-1 my-2" {...props} />,
                                                        ol: (props) => <ol className="list-decimal pl-5 space-y-1 my-2" {...props} />,
                                                        blockquote: (props) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2" {...props} />
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={endRef} className="h-4" />
                            </div>
                        )}
                    </div>
                </main>

                {/* Composer */}
                <footer className="sticky bottom-0 z-10 bg-gradient-to-b from-white/90 to-white/70 backdrop-blur-lg border-t border-indigo-100/50 shadow-[0_-4px_20px_-12px_rgba(99,102,241,0.1)]">
                    <form onSubmit={handleAsk} className="px-5 py-4">
                        <div className="mx-auto max-w-3xl">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 via-purple-500/20 to-pink-500/20 rounded-2xl -z-10 blur-md opacity-50"></div>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask anything about your documents..."
                                    className="w-full pl-6 pr-16 py-4 rounded-2xl border-0 bg-white/90 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-white/90 outline-none transition-all duration-300 shadow-lg backdrop-blur-sm"
                                    style={{
                                        boxShadow: '0 4px 20px -5px rgba(99, 102, 241, 0.1)'
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !input.trim()}
                                    aria-label={sending ? 'Generating' : 'Send'}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center rounded-2xl ${sending
                                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:scale-105'
                                        } transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                                >
                                    {sending ? (
                                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                            <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {composerError && (
                                <div className="mt-2 px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                                    <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>{composerError}</span>
                                </div>
                            )}
                            <p className="mt-3 text-xs text-center text-indigo-500/80 font-medium">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50/50 rounded-full">
                                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h2a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <span>AI may produce inaccurate information. Verify important details.</span>
                                </span>
                            </p>
                        </div>
                    </form>
                </footer>
            </div>
        </div>
    )
}
