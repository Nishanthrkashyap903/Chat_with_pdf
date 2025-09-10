import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { API_BASE } from '../lib/api.js'

export default function SignIn() {
    const navigate = useNavigate()
    const { register, handleSubmit, formState: { errors }, reset } = useForm({
        defaultValues: { username: '', password: '' }
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const onSubmit = async ({ username, password }) => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setError(data?.error || 'Sign in failed')
                return
            }
            reset()
            navigate('/dashboard', { replace: true })
        } catch (e) {
            console.error('SignIn error', e)
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-screen bg-gray-50">
            <div className="min-h-screen w-full flex items-center justify-center">
                <div className="w-full max-w-md mx-auto px-6 sm:px-8">
                    <div className="md:bg-white md:rounded-xl md:shadow md:border md:border-gray-200 md:p-10">
                        <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 text-center">Sign in</h1>
                        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
                        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
                            <div>
                                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                                <input
                                    id="username"
                                    type="text"
                                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    {...register('username', { required: 'Username is required', minLength: { value: 3, message: 'Min 3 characters' } })}
                                />
                                {errors.username && <p className="text-sm text-red-600 mt-1">{errors.username.message}</p>}
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                                <input
                                    id="password"
                                    type="password"
                                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md text-black focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })}
                                />
                                {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full sm:w-auto px-6 py-2 rounded-md font-medium text-white bg-black hover:bg-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black shadow-sm disabled:bg-neutral-700 disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Signing in…' : 'Sign in'}
                            </button>
                        </form>
                        <p className="mt-6 text-sm text-gray-700">
                            Are you a new user?{' '}
                            <Link className="text-indigo-600 hover:underline" to="/signup">Create an account</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
