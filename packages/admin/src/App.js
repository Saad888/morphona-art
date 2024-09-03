import React, { useEffect, useState } from 'react';
import { LoginPage } from './pages/login';
import { Dashboard } from "./pages/dashboard";
import { isUserAuthenticated } from './services/cognito';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { CreateEntryPage } from './pages/create/index.js';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true)
    const isUserAuth = isUserAuthenticated()
    setIsAuthenticated(isUserAuth)
    setLoading(false)
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Optionally, you can add a loading spinner here
  }

  if (!isAuthenticated)
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />

  return (
    <div>
      <Router>
        <Routes>
          <Route path="/create" element={<CreateEntryPage />} />
          <Route path="*" element={<Dashboard onLogout={() => setIsAuthenticated(false)} />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
