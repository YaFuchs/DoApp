import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UnifiedLoader from './UnifiedLoader';

export default function RouteRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // This logic determines where to send the user on app launch.
    const lastRoute = localStorage.getItem('lastVisitedRoute');
    
    // Default to Dashboard if no last route is found.
    const destination = lastRoute || '/Dashboard';
    
    // Replace the current entry in the history stack instead of pushing a new one.
    // This prevents the user from being able to click "back" to the loader screen.
    navigate(destination, { replace: true });

  }, [navigate]);

  // While the useEffect hook is running and navigating, display the unified loader.
  // This provides a consistent loading experience on cold start.
  return <UnifiedLoader />;
}