"use client"

import { useState, useEffect } from "react"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { restrictToParentElement } from "@dnd-kit/modifiers"
import { CSS } from "@dnd-kit/utilities"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Check, X } from "lucide-react"

type GrammarExerciseProps = {
  exerciseId: string
  onComplete?: (result: { correct: boolean; timeSpent: number }) => void
}

// Sortable item component for drag and drop
function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="draggable-item">
      {children}
    </div>
  )
}

export function GrammarExercise({ exerciseId, onComplete }: GrammarExerciseProps) {
  const [exercise, setExercise] = useState(null)
  const [userAnswer, setUserAnswer] = useState(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [startTime, setStartTime] = useState(0)
  const supabase = createClientSupabaseClient()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    fetchExercise()
  }, [exerciseId])

  useEffect(() => {
    if (exercise) {
      initializeUserAnswer()
      setStartTime(Date.now())
    }
  }, [exercise])

  const fetchExercise = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.from("grammar_exercises").select("*").eq("id", exerciseId).single()

      if (error) throw error

      setExercise(data)
    } catch (error) {
      console.error("Error fetching exercise:", error)
      toast({
        title: "Error",
        description: "Failed to load exercise",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const initializeUserAnswer = () => {
    if (!exercise) return

    switch (exercise.exercise_type) {
      case "sentence_construction":
        // Shuffle the words for the exercise
        const words = [...exercise.content.words]
        for (let i = words.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[words[i], words[j]] = [words[j], words[i]]
        }
        setUserAnswer({ words })
        break

      case "fill_blank":
        // Initialize with empty strings for each blank
        const blanks = exercise.content.blanks.map(() => "")
        setUserAnswer({ blanks })
        break

      case "word_order":
        // Shuffle the sentence parts
        const parts = [...exercise.content.parts]
        for (let i = parts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[parts[i], parts[j]] = [parts[j], parts[i]]
        }
        setUserAnswer({ parts })
        break

      case "case_system":
        // Initialize with empty strings for each case
        const cases = Object.keys(exercise.content.cases).reduce((acc, key) => {
          acc[key] = ""
          return acc
        }, {})
        setUserAnswer({ cases })
        break

      default:
        setUserAnswer({})
    }
  }

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setUserAnswer((prev) => {
        const oldIndex = prev.words.indexOf(active.id)
        const newIndex = prev.words.indexOf(over.id)

        return {
          ...prev,
          words: arrayMove(prev.words, oldIndex, newIndex),
        }
      })
    }
  }

  const handleInputChange = (index, value) => {
    setUserAnswer((prev) => {
      const newBlanks = [...prev.blanks]
      newBlanks[index] = value
      return { ...prev, blanks: newBlanks }
    })
  }

  const handleCaseInputChange = (caseKey, value) => {
    setUserAnswer((prev) => {
      return {
        ...prev,
        cases: {
          ...prev.cases,
          [caseKey]: value,
        },
      }
    })
  }

  const handleSubmit = async () => {
    if (!exercise || !userAnswer) return

    const timeSpent = Math.floor((Date.now() - startTime) / 1000) // in seconds

    let correct = false

    switch (exercise.exercise_type) {
      case "sentence_construction":
        correct = JSON.stringify(userAnswer.words) === JSON.stringify(exercise.solution.words)
        break

      case "fill_blank":
        correct = userAnswer.blanks.every(
          (answer, index) => answer.trim().toLowerCase() === exercise.solution.blanks[index].trim().toLowerCase(),
        )
        break

      case "word_order":
        correct = JSON.stringify(userAnswer.parts) === JSON.stringify(exercise.solution.parts)
        break

      case "case_system":
        correct = Object.keys(exercise.solution.cases).every(
          (key) => userAnswer.cases[key].trim().toLowerCase() === exercise.solution.cases[key].trim().toLowerCase(),
        )
        break

      default:
        correct = false
    }

    setIsCorrect(correct)
    setIsSubmitted(true)

    try {
      const { data: userData } = await supabase.auth.getUser()

      if (userData.user) {
        // Save attempt to database
        await supabase.from("user_exercise_attempts").insert({
          user_id: userData.user.id,
          exercise_id: exerciseId,
          user_answer: userAnswer,
          is_correct: correct,
          time_spent: timeSpent,
        })

        // If incorrect, save to mistakes for analysis
        if (!correct) {
          await supabase.from("user_mistakes").insert({
            user_id: userData.user.id,
            question_id: null, // Not a test question
            attempt_id: null, // Not a test attempt
            user_answer: JSON.stringify(userAnswer),
            correct_answer: JSON.stringify(exercise.solution),
            category: "grammar",
            grammar_point: exercise.grammar_point,
          })
        }
      }

      if (onComplete) {
        onComplete({ correct, timeSpent })
      }
    } catch (error) {
      console.error("Error saving attempt:", error)
    }
  }

  const renderExercise = () => {
    if (!exercise || !userAnswer) return null

    switch (exercise.exercise_type) {
      case "sentence_construction":
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{exercise.instructions}</p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToParentElement]}
            >
              <div className="droppable-area">
                <SortableContext items={userAnswer.words} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-wrap gap-2">
                    {userAnswer.words.map((word) => (
                      <SortableItem key={word} id={word}>
                        {word}
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </div>
            </DndContext>
          </div>
        )

      case "fill_blank":
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{exercise.instructions}</p>

            <div className="space-y-2">
              {exercise.content.text.map((segment, index) => (
                <span key={index}>
                  {segment}
                  {index < exercise.content.blanks.length && (
                    <Input
                      className="inline-block w-32 mx-1"
                      value={userAnswer.blanks[index]}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      disabled={isSubmitted}
                    />
                  )}
                </span>
              ))}
            </div>
          </div>
        )

      case "word_order":
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{exercise.instructions}</p>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToParentElement]}
            >
              <div className="droppable-area">
                <SortableContext items={userAnswer.parts} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-wrap gap-2">
                    {userAnswer.parts.map((part) => (
                      <SortableItem key={part} id={part}>
                        {part}
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </div>
            </DndContext>
          </div>
        )

      case "case_system":
        return (
          <div className="space-y-4">
            <p className="text-lg font-medium">{exercise.instructions}</p>

            <div className="grid gap-4">
              {Object.entries(exercise.content.cases).map(([caseKey, casePrompt]) => (
                <div key={caseKey} className="grid grid-cols-2 gap-2 items-center">
                  <Label>{casePrompt}</Label>
                  <Input
                    value={userAnswer.cases[caseKey]}
                    onChange={(e) => handleCaseInputChange(caseKey, e.target.value)}
                    disabled={isSubmitted}
                  />
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return <p>Unsupported exercise type</p>
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!exercise) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Exercise not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grammar Exercise</CardTitle>
        <CardDescription>{exercise.grammar_point}</CardDescription>
      </CardHeader>
      <CardContent>
        {renderExercise()}

        {isSubmitted && (
          <div className={`mt-4 p-4 rounded-md ${isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            <div className="flex items-center">
              {isCorrect ? <Check className="h-5 w-5 mr-2" /> : <X className="h-5 w-5 mr-2" />}
              <p className="font-medium">{isCorrect ? "Correct!" : "Incorrect. Try again."}</p>
            </div>
            {!isCorrect && exercise.explanation && <p className="mt-2">{exercise.explanation}</p>}
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!isSubmitted ? (
          <Button onClick={handleSubmit}>Submit Answer</Button>
        ) : (
          <Button onClick={initializeUserAnswer} variant="outline">
            Try Again
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
