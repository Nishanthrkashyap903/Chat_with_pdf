import { Navigate } from 'react-router-dom';
import { useAuthCheck } from '../lib/useAuthCheck.js';
import LoadingSpinner from './LoadingSpinner.jsx';

export function RootGate() {
    const { checking, authed } = useAuthCheck();
    const authState = checking ? 'loading' : (authed ? 'authed' : 'guest');
    if (authState === 'loading') return (<LoadingSpinner fullscreen size="md" color="indigo" />);
    return <Navigate to={authState === 'authed' ? '/dashboard' : '/signin'} replace />
}

export function ProtectedRoute({ children }) {
    const { checking, authed } = useAuthCheck()
    const authState = checking ? 'loading' : (authed ? 'authed' : 'guest');
    if (authState === 'loading') return <LoadingSpinner size="sm" color="indigo" />
    return authState === 'authed' ? children : <Navigate to="/signin" replace />
}