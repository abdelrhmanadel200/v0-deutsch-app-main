"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-provider"
import { AdaptiveTest } from "@/components/adaptive-test"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"

export default function TakeTestPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile } = useAuth()
  const [test, setTest] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarted, setIsStarted] = useState(false)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (profile && id) {
      fetchTest()
    }
  }, [profile, id])

  const fetchTest = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("tests")
        .select(`
          *,
          courses (
            title
          )
        `)
        .eq("id", id)
        .single()

      if (error) throw error

      setTest(data)
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

  const handleStartTest = () => {
    setIsStarted(true)
  }

  const handleTestComplete = (result) => {
    toast({
      title: "Test Completed",
      description: `You scored ${result.score} out of ${result.maxScore}`,
    })

    // Redirect to results page after a short delay
    setTimeout(() => {
      router.push("/dashboard/tests")
    }, 3000)
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

  if (!isStarted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <CardDescription>{test.courses?.title && `Course: ${test.courses.title}`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>{test.description}</p>

          {test.time_limit && (
            <div className="bg-amber-50 p-4 rounded-md">
              <p className="text-amber-800">
                This test has a time limit of {test.time_limit} minutes. Once you start, the timer will begin counting
                down.
              </p>
            </div>
          )}

          <p className="text-muted-foreground">
            This is an adaptive test. The difficulty of questions will adjust based on your performance.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleStartTest}>Start Test</Button>
        </CardFooter>
      </Card>
    )
  }

  return <AdaptiveTest testId={id as string} onComplete={handleTestComplete} />
}
