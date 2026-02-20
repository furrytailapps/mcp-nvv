export function searchAndSort<T extends { name: string }>(items: T[], query: string): T[] {
  const lowerQuery = query.toLowerCase();

  const matches = items.filter((item) => item.name.toLowerCase().includes(lowerQuery));

  // Sort by relevance - exact matches first, then by name
  matches.sort((a, b) => {
    const aExact = a.name.toLowerCase() === lowerQuery;
    const bExact = b.name.toLowerCase() === lowerQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return a.name.localeCompare(b.name, 'sv');
  });

  return matches;
}
