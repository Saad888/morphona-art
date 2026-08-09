// @ts-nocheck
import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { CategoryNav } from "../nav/index.js";
import MasonryGrid from "../grid/index.js";

const firstCategorySlug = (categories) =>
  [...categories].sort((a, b) => a.o - b.o)[0]?.s;

export const GalleryPage = ({ categories, entries, loaded }) => {
  const { categorySlug } = useParams();

  if (loaded && categories.length > 0 && !categories.some((c) => c.s === categorySlug)) {
    // Bad/stale slug (e.g. a category was renamed) - fall back to the first category
    return <Navigate to={`/${firstCategorySlug(categories)}`} replace />;
  }

  return (
    <>
      <CategoryNav categories={categories} activeSlug={categorySlug} />
      <MasonryGrid entries={entries} activeSlug={categorySlug} />
    </>
  );
};
