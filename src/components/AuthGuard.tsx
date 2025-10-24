import { useAuth } from '../providers/AuthProvider';
import { Navigate } from '@tanstack/react-router';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = '/login' 
}: AuthGuardProps) {
  const { user, isLoading, isInitialized } = useAuth();

  // Показываем загрузчик пока проверяем аутентификацию
  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="mt-4 text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Если требуется аутентификация, но пользователь не авторизован
  if (requireAuth && !user) {
    return <Navigate to={redirectTo} />;
  }

  // Если не требуется аутентификация (страницы login/signup), но пользователь авторизован
  if (!requireAuth && user) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}