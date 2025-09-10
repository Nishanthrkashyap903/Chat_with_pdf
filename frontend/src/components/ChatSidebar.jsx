export default function ChatSidebar({
  threadsInfo = [],
  loading = false,
  error = '',
  onRefresh = () => { },
  onSelect = () => { },
}) {
  return (
    <aside className="flex-1 overflow-y-auto p-3">
      {loading ? (
        <div className="flex items-center justify-center h-16">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
        </div>
      ) : error ? (
        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          <p>{error}</p>
          <button
            onClick={onRefresh}
            className="mt-2 text-indigo-600 hover:underline text-sm"
          >
            Retry
          </button>
        </div>
      ) : threadsInfo.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 mb-2">No conversations yet</p>
          <p className="text-xs text-gray-400">Upload a document to get started</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {threadsInfo.map((threadInfo) => (
            <li key={threadInfo.threadId}>
              <button
                onClick={() => onSelect(threadInfo.threadId)}
                className="w-full text-left px-3 py-2.5 rounded-lg bg-white hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 text-gray-700 hover:text-indigo-700 truncate transition-all duration-200 flex items-center text-sm"
                title={threadInfo.threadId}
              >
                <svg className="h-3.5 w-3.5 text-indigo-400 mr-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="truncate">{threadInfo.threadName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
