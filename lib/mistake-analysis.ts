// Mistake Analysis Utilities

export function analyzeUserMistakes(mistakes: any[]) {
  if (!mistakes || mistakes.length === 0) {
    return {
      totalMistakes: 0,
      categoryCounts: [],
      grammarPointCounts: [],
      mostCommonMistake: null,
      recommendedFocus: [],
    }
  }

  // Group by category
  const categoryMap: Record<string, number> = {}
  const grammarPointMap: Record<string, number> = {}

  mistakes.forEach((mistake) => {
    if (mistake.category) {
      categoryMap[mistake.category] = (categoryMap[mistake.category] || 0) + 1
    }

    if (mistake.grammar_point) {
      grammarPointMap[mistake.grammar_point] = (grammarPointMap[mistake.grammar_point] || 0) + 1
    }
  })

  // Sort by frequency
  const categoryCounts = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  const grammarPointCounts = Object.entries(grammarPointMap)
    .map(([grammarPoint, count]) => ({ grammarPoint, count }))
    .sort((a, b) => b.count - a.count)

  // Determine most common mistake
  const mostCommonMistake = categoryCounts.length > 0 ? categoryCounts[0] : null

  // Generate recommended focus areas (top 3)
  const recommendedFocus = grammarPointCounts.slice(0, 3).map((item) => item.grammarPoint)

  return {
    totalMistakes: mistakes.length,
    categoryCounts,
    grammarPointCounts,
    mostCommonMistake,
    recommendedFocus,
  }
}
