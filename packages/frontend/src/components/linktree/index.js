// @ts-nocheck
import React from 'react';
import styles from './linktree.module.scss';

const LinkTreeComponent = () => {
  return (
    <div className={styles.linkTreeContainer}>
      <a href="https://linktr.ee/morphona" target="_blank" rel="noopener noreferrer">
        <img
          src="./linktree-logo-icon.svg" 
          alt="Linktree Logo"
          className={styles.logo}
        />
      </a>
    </div>
  );
};

export default LinkTreeComponent;
