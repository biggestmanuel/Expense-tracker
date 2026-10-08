export const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f97316",
  Transport: "#2563eb",
  Shopping: "#db2777",
  Bills: "#7c3aed",
  Entertainment: "#0891b2",
  Health: "#16a34a",
  Education: "#ca8a04",
  Travel: "#0d9488",
  Other: "#64748b",
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#64748b";
}