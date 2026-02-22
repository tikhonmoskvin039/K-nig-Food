import documentationData from "../../configs/information-pages.json";

// Documentation Page Interface
export interface DocumentationPage {
  slug: string;
  title: string;
  description: string;
  order: number;
  content: string;
}

// Default fallback (empty information)
const defaultDocumentation: DocumentationPage[] = [];

/**
 * Get all information pages from configs/information-pages.json
 * Returns pages sorted by order field
 * Now using direct import for compatibility with Vercel
 */
export const getDocumentationPages = (): DocumentationPage[] => {
  try {
    const pages: DocumentationPage[] = documentationData as DocumentationPage[];

    // Sort by order field
    return pages.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error("Error loading configs/information-pages.json:", error);
    return defaultDocumentation;
  }
};

/**
 * Get a single information page by slug
 * Returns undefined if not found
 */
export const getDocumentationPageBySlug = (slug: string): DocumentationPage | undefined => {
  const pages = getDocumentationPages();
  return pages.find((page) => page.slug === slug);
};

/**
 * Get all valid information slugs for static path generation
 */
export const getDocumentationSlugs = (): string[] => {
  const pages = getDocumentationPages();
  return pages.map((page) => page.slug);
};
