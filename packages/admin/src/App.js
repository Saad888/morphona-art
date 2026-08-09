import React, { useEffect, useState } from 'react';
import { LoginPage } from './pages/login';
import { Dashboard } from "./pages/dashboard";
import { CategoryListPage } from './pages/categories/index.js';
import { isUserAuthenticated } from './services/cognito';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { CreateEntryPage } from './pages/create/index.js';
import { EditThumbnailPage } from './pages/editThumbnail/index.js';

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
          <Route path="/" element={<CategoryListPage onLogout={() => setIsAuthenticated(false)} />} />
          <Route path="/category/:slug" element={<Dashboard />} />
          <Route path="/category/:slug/create" element={<CreateEntryPage />} />
          <Route path="/category/:slug/edit-thumbnail/:id" element={<EditThumbnailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
