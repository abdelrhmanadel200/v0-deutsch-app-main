// Spaced Repetition Algorithm (SM-2)
export function calculateNextReview(rating: number, currentEaseFactor: number, currentInterval: number) {
  // Adjust ease factor based on performance (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
  const newEaseFactor = Math.max(1.3, currentEaseFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)))

  // Calculate new interval
  let newInterval: number

  if (rating < 3) {
    // If rating is poor, reset interval
    newInterval = 1
  } else if (currentInterval === 0) {
    // First successful review
    newInterval = 1
  } else if (currentInterval === 1) {
    // Second successful review
    newInterval = 6
  } else {
    // Subsequent successful reviews
    newInterval = Math.round(currentInterval * newEaseFactor)
  }

  // Calculate next review date
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + newInterval)

  return {
    newEaseFactor,
    newInterval,
    nextReview,
  }
}

export function getDueFlashcards(flashcards: any[]) {
  const now = new Date()
  return flashcards.filter((card) => {
    const nextReview = new Date(card.next_review)
    return nextReview <= now
  })
}
