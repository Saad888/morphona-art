// @ts-nocheck
import React from 'react';

import styles from './styles.module.scss';
import "./App.css";
import { Particles } from './components/Particles.js';
import { Logo } from './components/logo/index.js';

const App = () => {

  return (
    <div className={styles.container}>
      <Particles />
      <Logo />
    </div>
  )

}

export default App;
