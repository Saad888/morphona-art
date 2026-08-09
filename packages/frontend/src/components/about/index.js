// @ts-nocheck
import React from "react";
import ReactMarkdown from "react-markdown";
import { CategoryNav } from "../nav/index.js";
import styles from "./about.module.scss";

export const AboutPage = ({ content, categories }) => {
  return (
    <>
      <CategoryNav categories={categories} activeSlug={undefined} />
      <div className={styles.container}>
        <ReactMarkdown>{content || "Coming soon."}</ReactMarkdown>
      </div>
    </>
  );
};
