import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';


// Inside App.tsx
function ProfileGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const userStr = localStorage.getItem('narrow_fitness_user');
    if (!userStr) return;

    const user = JSON.parse(userStr);
    const isComplete = user.is_profile_complete;
    const isOnOnboarding = location.pathname === '/member/onboarding';

    // Guard for Members
    if (user.role === 'user') {
      if (!isComplete && !isOnOnboarding) {
        navigate('/member/onboarding', { replace: true });
      }
      if (isComplete && isOnOnboarding) {
        navigate('/member', { replace: true });
      }
    }
    
    // Guard for Admins (Admins should never see onboarding)
    if (user.role === 'admin' && isOnOnboarding) {
      navigate('/admin', { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
}
