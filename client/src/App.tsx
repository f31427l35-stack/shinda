import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import IntersectObserver from '@/components/common/IntersectObserver';
import { Toaster } from '@/components/ui/sonner';

import { routes } from './routes';

// import { AuthProvider } from '@/contexts/AuthContext';
// import { RouteGuard } from '@/components/common/RouteGuard';

const CLICK_TRACKING_URL =
  'https://shinda-beta.vercel.app/api/website-click';

const SESSION_CLICK_KEY = 'shinda_website_click_tracked';

const App: React.FC = () => {
  useEffect(() => {
    const alreadyTracked = sessionStorage.getItem(SESSION_CLICK_KEY);

    if (alreadyTracked) {
      return;
    }

    fetch(CLICK_TRACKING_URL, {
      method: 'POST',
      keepalive: true,
    })
      .then((response) => {
        if (response.ok) {
          sessionStorage.setItem(SESSION_CLICK_KEY, 'true');
        }
      })
      .catch(() => {
        // Tracking failure should never interrupt the website.
      });
  }, []);

  return (
    <Router>
      {/*<AuthProvider>*/}
      {/*<RouteGuard>*/}
      <IntersectObserver />

      <div className="flex flex-col min-h-screen">
        {/*<Header />*/}
        <main className="flex-grow">
          <Routes>
            {routes.map((route, index) => (
              <Route
                key={index}
                path={route.path}
                element={route.element}
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <Toaster />

      {/*</RouteGuard>*/}
      {/*</AuthProvider>*/}
    </Router>
  );
};

export default App;
