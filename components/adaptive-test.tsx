"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-provider"
import { calculateUserAbility, selectNextQuestion } from "@/lib/adaptive-testing"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/components/ui/use-toast"
import { Timer } from "@/components/timer"

type AdaptiveTestProps = {
  testId: string
  onComplete?: (result: { score: number; maxScore: number; timeSpent: number }) => void
}

export function AdaptiveTest({ testId, onComplete }: AdaptiveTestProps) {
  const { profile } = useAuth()
  const [test, setTest] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [userResponses, setUserResponses] = useState([])
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [userAbility, setUserAbility] = useState(3.0) // Start with medium difficulty
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState([])
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isTestComplete, setIsTestComplete] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [startTime, setStartTime] = useState(0)
  const [timeLimit, setTimeLimit] = useState(null)
  const [progress, setProgress] = useState(0)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchTest()
  }, [testId])

  useEffect(() => {
    if (questions.length > 0 && !currentQuestion) {
      selectNextQuestionForUser()
    }
  }, [questions])

  useEffect(() => {
    if (test) {
      setStartTime(Date.now())
      if (test.time_limit) {
        setTimeLimit(test.time_limit * 60) // Convert minutes to seconds
      }
    }
  }, [test])

  const fetchTest = async () => {
    setIsLoading(true)
    try {
      // Fetch test details
      const { data: testData, error: testError } = await supabase.from("tests").select("*").eq("id", testId).single()

      if (testError) throw testError

      setTest(testData)

      // Fetch questions for this test
      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .select(`
          *,
          answers (
            id,
            answer_text,
            is_correct
          )
        `)
        .eq("test_id", testId)

      if (questionError) throw questionError

      setQuestions(questionData || [])

      // Create test attempt record
      if (profile) {
        const { data: attemptData, error: attemptError } = await supabase
          .from("test_attempts")
          .insert({
            test_id: testId,
            student_id: profile.id,
            started_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (attemptError) throw attemptError
      }
    } catch (error) {
      console.error("Error fetching test:", error)
      toast({
        title: "Error",
        description: "Failed to load test",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectNextQuestionForUser = () => {
    // Use adaptive algorithm to select next question
    const nextQuestion = selectNextQuestion(userAbility, questions, answeredQuestionIds)

    if (nextQuestion) {
      setCurrentQuestion(nextQuestion)
      setSelectedAnswer(null)
      setIsSubmitted(false)
    } else {
      // No more questions or all questions answered
      completeTest()
    }
  }

  const handleAnswerSelect = (answerId) => {
    setSelectedAnswer(answerId)
  }

  const handleSubmitAnswer = async () => {
    if (!selectedAnswer || !currentQuestion) return

    // Check if answer is correct
    const selectedAnswerObj = currentQuestion.answers.find((a) => a.id === selectedAnswer)
    const isCorrect = selectedAnswerObj?.is_correct || false

    // Update user responses
    const response = {
      questionId: currentQuestion.id,
      answerId: selectedAnswer,
      correct: isCorrect,
      questionDifficulty: currentQuestion.difficulty || 3.0,
    }

    setUserResponses([...userResponses, response])
    setAnsweredQuestionIds([...answeredQuestionIds, currentQuestion.id])
    setIsSubmitted(true)

    // Update user ability estimate
    const newResponses = [...userResponses, response]
    const newAbility = calculateUserAbility(
      newResponses.map((r) => ({
        questionDifficulty: r.questionDifficulty,
        correct: r.correct,
      })),
    )

    setUserAbility(newAbility)

    // Save response to database
    try {
      if (profile) {
        await supabase.from("student_answers").insert({
          attempt_id: null, // We'll update this when test is complete
          question_id: currentQuestion.id,
          answer_id: selectedAnswer,
          is_correct: isCorrect,
        })

        // If incorrect, save to mistakes for analysis
        if (!isCorrect) {
          await supabase.from("user_mistakes").insert({
            user_id: profile.id,
            question_id: currentQuestion.id,
            attempt_id: null, // We'll update this when test is complete
            user_answer: selectedAnswerObj?.answer_text || "",
            correct_answer: currentQuestion.answers.find((a) => a.is_correct)?.answer_text || "",
            category: currentQuestion.category || "vocabulary",
            grammar_point: currentQuestion.grammar_point || null,
          })
        }
      }
    } catch (error) {
      console.error("Error saving answer:", error)
    }
  }

  const handleNextQuestion = () => {
    // Update progress
    setProgress(Math.min(100, (answeredQuestionIds.length / Math.min(questions.length, 10)) * 100))

    // Check if we've reached the maximum number of questions (10)
    if (answeredQuestionIds.length >= 10) {
      completeTest()
    } else {
      selectNextQuestionForUser()
    }
  }

  const completeTest = async () => {
    const timeSpent = Math.floor((Date.now() - startTime) / 1000) // in seconds
    const correctAnswers = userResponses.filter((r) => r.correct).length
    const totalQuestions = userResponses.length

    setIsTestComplete(true)

    try {
      if (profile) {
        // Update test attempt with completion data
        const { data: attemptData, error: attemptError } = await supabase
          .from("test_attempts")
          .insert({
            test_id: testId,
            student_id: profile.id,
            started_at: new Date(startTime).toISOString(),
            completed_at: new Date().toISOString(),
            score: correctAnswers,
            max_score: totalQuestions,
          })
          .select()
          .single()

        if (attemptError) throw attemptError

        // Update student answers with attempt_id
        if (attemptData) {
          for (const response of userResponses) {
            await supabase.from("student_answers").update({ attempt_id: attemptData.id }).match({
              question_id: response.questionId,
              answer_id: response.answerId,
            })

            // Update mistakes with attempt_id
            if (!response.correct) {
              await supabase.from("user_mistakes").update({ attempt_id: attemptData.id }).match({
                user_id: profile.id,
                question_id: response.questionId,
              })
            }
          }
        }

        // Add to user progress
        await supabase.from("user_progress").insert({
          user_id: profile.id,
          activity_type: "tests",
          activity_id: testId,
          score: correctAnswers,
          max_score: totalQuestions,
          time_spent: timeSpent,
          completed_at: new Date().toISOString(),
        })
      }

      if (onComplete) {
        onComplete({
          score: correctAnswers,
          maxScore: totalQuestions,
          timeSpent,
        })
      }
    } catch (error) {
      console.error("Error completing test:", error)
    }
  }

  const handleTimeUp = () => {
    completeTest()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!test) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Test not found</p>
        </CardContent>
      </Card>
    )
  }

  if (isTestComplete) {
    const correctAnswers = userResponses.filter((r) => r.correct).length
    const totalQuestions = userResponses.length
    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

    return (
      <Card>
        <CardHeader>
          <CardTitle>Test Complete</CardTitle>
          <CardDescription>Your results for {test.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <p className="text-4xl font-bold">{score}%</p>
            <p className="text-muted-foreground">
              {correctAnswers} correct out of {totalQuestions} questions
            </p>
          </div>

          <Progress value={score} className="h-2" />

          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-medium">Question Summary</h3>
            {userResponses.map((response, index) => {
              const question = questions.find((q) => q.id === response.questionId)
              const answer = question?.answers.find((a) => a.id === response.answerId)
              const correctAnswer = question?.answers.find((a) => a.is_correct)

              return (
                <div key={index} className={`p-4 rounded-md ${response.correct ? "bg-green-50" : "bg-red-50"}`}>
                  <p className="font-medium">{question?.question_text}</p>
                  <p className={response.correct ? "text-green-600" : "text-red-600"}>
                    Your answer: {answer?.answer_text}
                  </p>
                  {!response.correct && <p className="text-green-600">Correct answer: {correctAnswer?.answer_text}</p>}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{test.title}</CardTitle>
            <CardDescription>
              Question {answeredQuestionIds.length + 1} of {Math.min(questions.length, 10)}
            </CardDescription>
          </div>
          {timeLimit && <Timer initialTime={timeLimit} onTimeUp={handleTimeUp} />}
        </div>
      </CardHeader>
      <CardContent>
        <Progress value={progress} className="h-2 mb-6" />

        {currentQuestion && (
          <div className="space-y-4">
            <p className="text-lg font-medium">{currentQuestion.question_text}</p>

            <RadioGroup value={selectedAnswer || ""} onValueChange={handleAnswerSelect} className="space-y-2">
              {currentQuestion.answers.map((answer) => (
                <div
                  key={answer.id}
                  className={`flex items-center space-x-2 rounded-md border p-4 ${
                    isSubmitted && answer.is_correct ? "bg-green-50" : ""
                  } ${isSubmitted && selectedAnswer === answer.id && !answer.is_correct ? "bg-red-50" : ""}`}
                >
                  <RadioGroupItem value={answer.id} id={answer.id} disabled={isSubmitted} />
                  <Label htmlFor={answer.id} className="flex-grow cursor-pointer">
                    {answer.answer_text}
                  </Label>
                  {isSubmitted && answer.is_correct && <span className="text-green-600 text-sm">Correct</span>}
                  {isSubmitted && selectedAnswer === answer.id && !answer.is_correct && (
                    <span className="text-red-600 text-sm">Incorrect</span>
                  )}
                </div>
              ))}
            </RadioGroup>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!isSubmitted ? (
          <Button onClick={handleSubmitAnswer} disabled={!selectedAnswer}>
            Submit Answer
          </Button>
        ) : (
          <Button onClick={handleNextQuestion}>Next Question</Button>
        )}
      </CardFooter>
    </Card>
  )
}
