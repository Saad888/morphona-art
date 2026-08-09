// @ts-nocheck
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./nav.module.scss";

export const CategoryNav = ({ categories, activeSlug }) => {
  const navigate = useNavigate();
  const location = useLocation();

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
      <button
        className={`${styles.navButton} ${location.pathname === "/about" ? styles.active : ""}`}
        onClick={() => navigate("/about")}
      >
        About Me
      </button>
    </div>
  );
};
