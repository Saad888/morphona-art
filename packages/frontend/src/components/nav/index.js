// @ts-nocheck
import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./nav.module.scss";

export const CategoryNav = ({ categories, activeSlug }) => {
  const navigate = useNavigate();

  if (!categories || categories.length === 0) {
    return null;
  }

  const sortedCategories = [...categories].sort((a, b) => a.o - b.o);

  return (
    <div className={styles.nav}>
      {sortedCategories.map((category) => (
        <button
          key={category.s}
          className={`${styles.navButton} ${category.s === activeSlug ? styles.active : ""}`}
          onClick={() => navigate(`/${category.s}`)}
        >
          {category.n}
        </button>
      ))}
    </div>
  );
};
