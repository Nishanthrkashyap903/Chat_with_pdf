import { useEffect, useState } from 'react'
import { API_BASE } from './api.js'

/**
 * useAuthCheck
 * Performs a one-time call to the backend to determine the user's auth status.
 * Exposes a single `state` string and convenience booleans for easy branching.
 */
export function useAuthCheck() {
    // Single source of truth for auth status
    // Possible values: 'loading' | 'authed' | 'guest'
    const [state, setState] = useState('loading')

    useEffect(() => {
        // Track unmounts to avoid setting state after the component is gone
        let cancelled = false

        const check = async () => {
            try {
                // Ask the backend for the current session/profile; include cookies
                const res = await fetch(`${API_BASE}/auth/profile`, { credentials: 'include' })

                // Map HTTP success to 'authed', otherwise treat as 'guest'
                if (!cancelled) setState(res.ok ? 'authed' : 'guest')
            } catch (e) {
                // Network or server error → treat as unauthenticated
                console.error('Auth check failed', e)
                if (!cancelled) setState('guest')
            }
        }

        // Kick off the check once on mount
        check()

        // Cleanup: flip the flag so no state updates happen after unmount
        return () => { cancelled = true }
    }, [])

    // Convenience flags for existing consumers
    const checking = state === 'loading'
    const authed = state === 'authed'

    // Return both the single state and derived booleans
    return { state, checking, authed }
}
