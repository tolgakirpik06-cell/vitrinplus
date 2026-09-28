/** Stable UUID identity for canonical slugs and historical demo-/urun- links. */
export function productIdFromReference(slug: string): string | null {
  return slug.match(/(?:^|-)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1]?.toLowerCase() ?? null;
}
export function sameProductReference(a: string, b: string): boolean {
  const id = productIdFromReference(a);
  return a === b || (id !== null && id === productIdFromReference(b));
}
