export default function LoadingSpinner({ fullscreen = false, size = 'md', color = 'indigo', label = 'Loading…' }) {
  const sizeMap = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  }
  const colorMap = {
    indigo: 'border-indigo-500',
    slate: 'border-slate-500',
    gray: 'border-gray-500',
    black: 'border-black',
    white: 'border-white',
  }

  const spinner = (
    <div
      role="status"
      aria-label={label}
      className={`animate-spin rounded-full ${sizeMap[size] || sizeMap.md} border-t-2 border-b-2 ${colorMap[color] || colorMap.indigo}`}
    />
  )

  if (fullscreen) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        {spinner}
      </div>
    )
  }

  return <div className="inline-flex items-center justify-center">{spinner}</div>
}
