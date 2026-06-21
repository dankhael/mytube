// Shared anchor between the category chip row and the category sections it jumps
// to (spec home-category-chips / CHIP-3). Both sides derive the section's DOM id
// from the same function so a rename can never desync the chip from its target.

// DOM id stamped on a `CategorySection` and looked up by its chip. The prefix
// namespaces it away from any YouTube/React id; the name is used verbatim so the
// lookup is exact (getElementById accepts arbitrary strings).
export function sectionDomId(categoryName: string): string {
  return `cat-section:${categoryName}`
}

// Smooth-scrolls the home to a category's section. `doc` is injectable so the
// jsdom test can drive it without a real document (Decisions §1). A missing
// section (e.g. filtered out) is a no-op rather than a throw.
export function scrollToCategory(
  categoryName: string,
  doc: Pick<Document, 'getElementById'> = document,
): void {
  doc.getElementById(sectionDomId(categoryName))?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}
