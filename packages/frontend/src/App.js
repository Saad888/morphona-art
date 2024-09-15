// @ts-nocheck
import React from 'react';

import styles from './styles.module.scss';
import "./App.css";
import { Particles } from './components/Particles.js';
import { Logo } from './components/logo/index.js';
import { Divider } from './components/divider/index.js';
import MasonryGrid from './components/grid/index.js';

const App = () => {

  return (
    <div className={styles.container}>
      <Particles />
      <Logo />
      <Divider />
      <MasonryGrid />
    </div>
  )

}

export default App;
