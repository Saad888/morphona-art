// @ts-nocheck
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import styles from './styles.module.scss';
import "./App.css";
import { Particles } from './components/Particles.js';
import { Logo } from './components/logo/index.js';
import { Divider } from './components/divider/index.js';
import { GalleryPage } from './components/gallery/index.js';
import { AboutPage } from './components/about/index.js';
import LinkTreeComponent from './components/linktree/index.js';

const CLOUDFRONT_URL = 'https://df8iwee0cmtv2.cloudfront.net';

const RootRedirect = ({ categories, loaded }) => {
  if (!loaded || categories.length === 0) {
    return null;
  }
  const firstSlug = [...categories].sort((a, b) => a.o - b.o)[0].s;
  return <Navigate to={`/${firstSlug}`} replace />;
};

const App = () => {
  const [categories, setCategories] = useState([]);
  const [entries, setEntries] = useState([]);
  const [aboutContent, setAboutContent] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${CLOUDFRONT_URL}/data.json`);
        setCategories(response.data.categories ?? []);
        setEntries(response.data.entries ?? []);
        setAboutContent(response.data.about ?? '');
      } catch (error) {
        console.error('Error fetching the data', error);
      } finally {
        setLoaded(true);
      }
    };
    fetchData();
  }, []);

  return (
    <div className={styles.container}>
      <Router>
        <Particles />
        <Logo />
        <Divider />
        <Routes>
          <Route path="/" element={<RootRedirect categories={categories} loaded={loaded} />} />
          <Route path="/about" element={<AboutPage content={aboutContent} categories={categories} />} />
          <Route
            path="/:categorySlug"
            element={<GalleryPage categories={categories} entries={entries} loaded={loaded} />}
          />
        </Routes>
        <Divider />
        <LinkTreeComponent />
      </Router>
    </div>
  )

}

export default App;
