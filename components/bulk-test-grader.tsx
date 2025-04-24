"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { CheckCircle, Clock, Download, Loader2 } from "lucide-react"

type TestAttempt = {
  id: string
  student_id: string
  started_at: string
  completed_at: string | null
  score: number | null
  max_score: number | null
  student_name?: string
}

export function BulkTestGrader() {
  const { profile } = useAuth()
  const [tests, setTests] = useState<any[]>([])
  const [selectedTest, setSelectedTest] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<TestAttempt[]>([])
  const [selectedAttempts, setSelectedAttempts] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGrading, setIsGrading] = useState(false)
  const [gradingResults, setGradingResults] = useState<any[] | null>(null)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (profile) {
      fetchTests()
    }
  }, [profile])

  useEffect(() => {
    if (selectedTest) {
      fetchTestAttempts()
    }
  }, [selectedTest])

  const fetchTests = async () => {
    setIsLoading(true)
    try {
      let query = supabase.from("tests").select("*").order("created_at", { ascending: false })

      if (profile.role !== "admin") {
        query = query.eq("created_by", profile.id)
      }

      const { data, error } = await query

      if (error) throw error

      setTests(data || [])
    } catch (error) {
      console.error("Error fetching tests:", error)
      toast({
        title: "Error",
        description: "Failed to load tests",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTestAttempts = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("test_attempts")
        .select(`
          *,
          profiles:student_id (
            first_name,
            last_name
          )
        `)
        .eq("test_id", selectedTest)
        .order("started_at", { ascending: false })

      if (error) throw error

      const formattedAttempts = data.map((attempt) => ({
        ...attempt,
        student_name: attempt.profiles
          ? `${attempt.profiles.first_name} ${attempt.profiles.last_name}`
          : "Unknown Student",
      }))

      setAttempts(formattedAttempts)
      setSelectedAttempts([])
      setGradingResults(null)
    } catch (error) {
      console.error("Error fetching test attempts:", error)
      toast({
        title: "Error",
        description: "Failed to load test attempts",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAttemptSelect = (attemptId: string) => {
    setSelectedAttempts((prev) =>
      prev.includes(attemptId) ? prev.filter((id) => id !== attemptId) : [...prev, attemptId],
    )
  }

  const handleSelectAll = () => {
    if (selectedAttempts.length === attempts.length) {
      setSelectedAttempts([])
    } else {
      setSelectedAttempts(attempts.map((a) => a.id))
    }
  }

  const handleGradeSelected = async () => {
    if (!selectedTest || selectedAttempts.length === 0) return

    setIsGrading(true)
    setGradingResults(null)

    try {
      // Fetch test questions and correct answers
      const { data: questions } = await supabase
        .from("questions")
        .select(`
          id,
          question_text,
          question_type,
          points,
          answers (id, answer_text, is_correct)
        `)
        .eq("test_id", selectedTest)

      if (!questions || questions.length === 0) {
        throw new Error("No questions found for this test")
      }

      // Create a map of correct answers for quick lookup
      const correctAnswersMap = {}
      questions.forEach((question) => {
        correctAnswersMap[question.id] = {
          correctAnswers: question.answers.filter((answer) => answer.is_correct).map((answer) => answer.id),
          points: question.points || 1,
        }
      })

      const results = []

      // Process each attempt
      for (const attemptId of selectedAttempts) {
        // Fetch student answers
        const { data: studentAnswers } = await supabase.from("student_answers").select("*").eq("attempt_id", attemptId)

        // Grade each answer
        let score = 0
        let maxScore = 0

        questions.forEach((question) => {
          const questionPoints = question.points || 1
          maxScore += questionPoints

          const studentAnswer = studentAnswers?.find((a) => a.question_id === question.id)

          if (studentAnswer && correctAnswersMap[question.id].correctAnswers.includes(studentAnswer.answer_id)) {
            score += questionPoints

            // Update student_answers with is_correct
            supabase.from("student_answers").update({ is_correct: true }).eq("id", studentAnswer.id).then()
          } else if (studentAnswer) {
            // Update student_answers with is_correct
            supabase.from("student_answers").update({ is_correct: false }).eq("id", studentAnswer.id).then()
          }
        })

        // Update attempt with score
        await supabase
          .from("test_attempts")
          .update({
            score,
            max_score: maxScore,
            completed_at: studentAnswers?.length > 0 ? new Date().toISOString() : null,
          })
          .eq("id", attemptId)

        // Get student name
        const attempt = attempts.find((a) => a.id === attemptId)

        results.push({
          attemptId,
          studentName: attempt?.student_name || "Unknown Student",
          score,
          maxScore,
          percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
        })
      }

      setGradingResults(results)

      // Refresh attempts
      fetchTestAttempts()

      toast({
        title: "Success",
        description: `Graded ${results.length} test attempts`,
      })
    } catch (error) {
      console.error("Error grading tests:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to grade tests",
        variant: "destructive",
      })
    } finally {
      setIsGrading(false)
    }
  }

  const exportResults = () => {
    if (!gradingResults) return

    const csvContent = [
      ["Student", "Score", "Max Score", "Percentage"].join(","),
      ...gradingResults.map((result) =>
        [result.studentName, result.score, result.maxScore, `${result.percentage}%`].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `test_results_${selectedTest}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (isLoading && tests.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Select value={selectedTest || ""} onValueChange={(value) => setSelectedTest(value || null)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a test" />
            </SelectTrigger>
            <SelectContent>
              {tests.map((test) => (
                <SelectItem key={test.id} value={test.id}>
                  {test.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTest && selectedAttempts.length > 0 && (
          <Button onClick={handleGradeSelected} disabled={isGrading}>
            {isGrading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Grading...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Grade Selected ({selectedAttempts.length})
              </>
            )}
          </Button>
        )}
      </div>

      {selectedTest && (
        <Card>
          <CardHeader>
            <CardTitle>Test Attempts</CardTitle>
            <CardDescription>{tests.find((t) => t.id === selectedTest)?.title || "Selected Test"}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : attempts.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Checkbox
                    id="select-all"
                    checked={selectedAttempts.length === attempts.length && attempts.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="font-medium">
                    Select All
                  </Label>
                </div>

                {attempts.map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={attempt.id}
                        checked={selectedAttempts.includes(attempt.id)}
                        onCheckedChange={() => handleAttemptSelect(attempt.id)}
                      />
                      <div>
                        <p className="font-medium">{attempt.student_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Started: {new Date(attempt.started_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {attempt.completed_at ? (
                        <div className="text-right">
                          <p className="font-medium">
                            {attempt.score}/{attempt.max_score}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {attempt.max_score > 0
                              ? `${Math.round((attempt.score / attempt.max_score) * 100)}%`
                              : "N/A"}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center text-amber-500">
                          <Clock className="mr-1 h-4 w-4" />
                          <span className="text-sm">In progress</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No test attempts found</p>
              </div>
            )}
          </CardContent>
          {gradingResults && (
            <CardFooter className="flex-col items-start space-y-4">
              <div className="w-full border-t pt-4">
                <h3 className="text-lg font-medium mb-2">Grading Results</h3>
                <div className="space-y-2">
                  {gradingResults.map((result, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                      <p>{result.studentName}</p>
                      <div className="text-right">
                        <p className="font-medium">
                          {result.score}/{result.maxScore} ({result.percentage}%)
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="mt-4" onClick={exportResults}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Results
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}
    </div>
  )
}
