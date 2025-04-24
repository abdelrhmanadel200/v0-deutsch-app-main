// Adaptive Testing Algorithms

// Calculate user ability based on responses (simplified IRT)
export function calculateUserAbility(responses: { questionDifficulty: number; correct: boolean }[]) {
  if (responses.length === 0) return 3.0 // Default medium difficulty

  // Simple ability estimation based on correct/incorrect responses and question difficulty
  let totalDifficulty = 0
  let correctDifficulty = 0

  responses.forEach((response) => {
    totalDifficulty += response.questionDifficulty
    if (response.correct) {
      correctDifficulty += response.questionDifficulty
    }
  })

  // Calculate ability as weighted average of correct responses
  const correctRatio = responses.filter((r) => r.correct).length / responses.length
  const abilityEstimate = (correctDifficulty / totalDifficulty) * 5 * correctRatio

  // Ensure ability is between 1-5
  return Math.max(1, Math.min(5, abilityEstimate))
}

// Select next question based on user ability
export function selectNextQuestion(userAbility: number, questions: any[], answeredQuestionIds: string[]) {
  // Filter out already answered questions
  const availableQuestions = questions.filter((q) => !answeredQuestionIds.includes(q.id))

  if (availableQuestions.length === 0) return null

  // Find question with difficulty closest to current user ability
  return availableQuestions.reduce((best, current) => {
    const bestDiff = Math.abs(best.difficulty - userAbility)
    const currentDiff = Math.abs(current.difficulty - userAbility)
    return currentDiff < bestDiff ? current : best
  })
}
