import React, { useEffect, useState } from 'react';
import { LoginPage } from './pages/login';
import { Dashboard } from './pages/dashboard';
import { isUserAuthenticated } from './services/cognito';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true)
    setIsAuthenticated(isUserAuthenticated)
    setLoading(false)
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Optionally, you can add a loading spinner here
  }

  return (
    <div>
      {
        isAuthenticated ?
          <Dashboard onLogout={() => setIsAuthenticated(false)} /> :
          <LoginPage onLogin={() => setIsAuthenticated(true)} />
      }
    </div>
  );
}

export default App;
