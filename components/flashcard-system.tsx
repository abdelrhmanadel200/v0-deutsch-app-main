"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { calculateNextReview, getDueFlashcards } from "@/lib/spaced-repetition"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react"

type Flashcard = {
  id: string
  german_word: string
  translation: string
  example_sentence: string | null
  image_url: string | null
  audio_url: string | null
}

type UserFlashcard = {
  id: string
  flashcard_id: string
  ease_factor: number
  interval: number
  next_review: string
  review_count: number
  flashcard: Flashcard
}

export function FlashcardSystem({ courseId }: { courseId: string }) {
  const [flashcards, setFlashcards] = useState<UserFlashcard[]>([])
  const [dueFlashcards, setDueFlashcards] = useState<UserFlashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchFlashcards()
  }, [courseId])

  useEffect(() => {
    if (flashcards.length > 0) {
      const due = getDueFlashcards(flashcards)
      setDueFlashcards(due)
      setProgress(0)
    }
  }, [flashcards])

  const fetchFlashcards = async () => {
    setIsLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()

      if (!userData.user) {
        toast({
          title: "Error",
          description: "You must be logged in to use flashcards",
          variant: "destructive",
        })
        return
      }

      // Get user's flashcards for this course
      const { data: userFlashcards, error } = await supabase
        .from("user_flashcards")
        .select(`
          *,
          flashcard:flashcard_id (
            id,
            german_word,
            translation,
            example_sentence,
            image_url,
            audio_url
          )
        `)
        .eq("user_id", userData.user.id)
        .in("flashcard_id", supabase.from("flashcards").select("id").eq("course_id", courseId))

      if (error) throw error

      if (userFlashcards && userFlashcards.length > 0) {
        setFlashcards(userFlashcards as UserFlashcard[])
      } else {
        // If user doesn't have flashcards yet, get all course flashcards and create user_flashcards
        const { data: courseFlashcards } = await supabase.from("flashcards").select("*").eq("course_id", courseId)

        if (courseFlashcards && courseFlashcards.length > 0) {
          // Create user_flashcards entries
          const userFlashcardsToInsert = courseFlashcards.map((flashcard) => ({
            user_id: userData.user!.id,
            flashcard_id: flashcard.id,
            ease_factor: 2.5,
            interval: 0,
            next_review: new Date().toISOString(),
            review_count: 0,
          }))

          const { error: insertError } = await supabase.from("user_flashcards").insert(userFlashcardsToInsert)

          if (insertError) throw insertError

          // Fetch the newly created user_flashcards
          const { data: newUserFlashcards } = await supabase
            .from("user_flashcards")
            .select(`
              *,
              flashcard:flashcard_id (
                id,
                german_word,
                translation,
                example_sentence,
                image_url,
                audio_url
              )
            `)
            .eq("user_id", userData.user.id)
            .in(
              "flashcard_id",
              courseFlashcards.map((f) => f.id),
            )

          if (newUserFlashcards) {
            setFlashcards(newUserFlashcards as UserFlashcard[])
          }
        }
      }
    } catch (error) {
      console.error("Error fetching flashcards:", error)
      toast({
        title: "Error",
        description: "Failed to load flashcards",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleRating = async (rating: number) => {
    if (dueFlashcards.length === 0 || currentIndex >= dueFlashcards.length) return

    try {
      const currentCard = dueFlashcards[currentIndex]
      const { newEaseFactor, newInterval, nextReview } = calculateNextReview(
        rating,
        currentCard.ease_factor,
        currentCard.interval,
      )

      // Update in database
      const { error } = await supabase
        .from("user_flashcards")
        .update({
          ease_factor: newEaseFactor,
          interval: newInterval,
          next_review: nextReview.toISOString(),
          review_count: currentCard.review_count + 1,
          last_reviewed: new Date().toISOString(),
        })
        .eq("id", currentCard.id)

      if (error) throw error

      // Update local state
      setFlashcards((prev) =>
        prev.map((card) =>
          card.id === currentCard.id
            ? {
                ...card,
                ease_factor: newEaseFactor,
                interval: newInterval,
                next_review: nextReview.toISOString(),
                review_count: card.review_count + 1,
              }
            : card,
        ),
      )

      // Move to next card
      if (currentIndex < dueFlashcards.length - 1) {
        setCurrentIndex(currentIndex + 1)
        setIsFlipped(false)
        setProgress(((currentIndex + 1) / dueFlashcards.length) * 100)
      } else {
        // Finished all cards
        setProgress(100)
        toast({
          title: "Success",
          description: "You've completed all due flashcards!",
        })
      }
    } catch (error) {
      console.error("Error updating flashcard:", error)
      toast({
        title: "Error",
        description: "Failed to update flashcard",
        variant: "destructive",
      })
    }
  }

  const playAudio = (url: string) => {
    if (!url) return
    const audio = new Audio(url)
    audio.play()
  }

  const handleNext = () => {
    if (currentIndex < dueFlashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setIsFlipped(false)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setIsFlipped(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (dueFlashcards.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <p className="text-lg font-medium mb-4">No flashcards due for review!</p>
          <Button onClick={fetchFlashcards}>Refresh</Button>
        </CardContent>
      </Card>
    )
  }

  if (currentIndex >= dueFlashcards.length) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <p className="text-lg font-medium mb-4">You've completed all due flashcards!</p>
          <Button
            onClick={() => {
              setCurrentIndex(0)
              fetchFlashcards()
            }}
          >
            Start Over
          </Button>
        </CardContent>
      </Card>
    )
  }

  const currentCard = dueFlashcards[currentIndex]
  const currentFlashcard = currentCard.flashcard

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Card {currentIndex + 1} of {dueFlashcards.length}
        </p>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={handlePrevious} disabled={currentIndex === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            disabled={currentIndex === dueFlashcards.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="flashcard" onClick={handleFlip}>
        <div className={`flashcard-inner ${isFlipped ? "flipped" : ""}`}>
          <div className="flashcard-front">
            {currentFlashcard.image_url && (
              <img
                src={currentFlashcard.image_url || "/placeholder.svg"}
                alt={currentFlashcard.german_word}
                className="flashcard-image"
              />
            )}
            <h3 className="flashcard-word">{currentFlashcard.german_word}</h3>
            {currentFlashcard.audio_url && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  playAudio(currentFlashcard.audio_url!)
                }}
              >
                <Volume2 className="h-5 w-5" />
              </Button>
            )}
          </div>
          <div className="flashcard-back">
            <h3 className="flashcard-translation">{currentFlashcard.translation}</h3>
            {currentFlashcard.example_sentence && (
              <p className="flashcard-example">{currentFlashcard.example_sentence}</p>
            )}
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className="grid grid-cols-5 gap-2 mt-4">
          {[1, 2, 3, 4, 5].map((rating) => (
            <Button
              key={rating}
              variant={rating < 3 ? "destructive" : rating > 3 ? "default" : "outline"}
              onClick={() => handleRating(rating)}
            >
              {rating}
            </Button>
          ))}
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground mt-2">
        <p>Click the card to reveal the answer, then rate your recall from 1 (difficult) to 5 (easy)</p>
      </div>
    </div>
  )
}
