"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { analyzeUserMistakes } from "@/lib/mistake-analysis"

export function ProgressVisualization() {
  const { profile } = useAuth()
  const [testScores, setTestScores] = useState([])
  const [activityData, setActivityData] = useState([])
  const [mistakeAnalysis, setMistakeAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (profile) {
      fetchUserProgress()
    }
  }, [profile])

  const fetchUserProgress = async () => {
    setIsLoading(true)
    try {
      // Fetch test scores
      const { data: testAttempts, error: testError } = await supabase
        .from("test_attempts")
        .select(`
          id,
          test_id,
          started_at,
          completed_at,
          score,
          max_score,
          tests (
            title
          )
        `)
        .eq("student_id", profile.id)
        .order("completed_at", { ascending: true })

      if (testError) throw testError

      // Format test data for charts
      const formattedTestData = testAttempts
        .filter((attempt) => attempt.completed_at && attempt.max_score > 0)
        .map((attempt) => ({
          name: attempt.tests?.title || `Test ${attempt.test_id}`,
          date: new Date(attempt.completed_at).toLocaleDateString(),
          score: Math.round((attempt.score / attempt.max_score) * 100),
          rawScore: attempt.score,
          maxScore: attempt.max_score,
        }))

      setTestScores(formattedTestData)

      // Fetch activity data (exercises, flashcards, etc.)
      const { data: progressData, error: progressError } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", profile.id)
        .order("completed_at", { ascending: true })

      if (progressError) throw progressError

      // Group by day and activity type
      const activityByDay = progressData.reduce((acc, item) => {
        const day = new Date(item.completed_at).toLocaleDateString()

        if (!acc[day]) {
          acc[day] = {
            date: day,
            tests: 0,
            exercises: 0,
            flashcards: 0,
            materials: 0,
          }
        }

        acc[day][item.activity_type] = (acc[day][item.activity_type] || 0) + 1

        return acc
      }, {})

      setActivityData(Object.values(activityByDay))

      // Fetch mistakes for analysis
      const { data: mistakes, error: mistakesError } = await supabase
        .from("user_mistakes")
        .select("*")
        .eq("user_id", profile.id)

      if (mistakesError) throw mistakesError

      const analysis = analyzeUserMistakes(mistakes)
      setMistakeAnalysis(analysis)
    } catch (error) {
      console.error("Error fetching progress data:", error)
      toast({
        title: "Error",
        description: "Failed to load progress data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  const COLORS = ["#DE0000", "#FFCE00", "#000000", "#666666", "#999999"]

  return (
    <div className="space-y-6">
      <Tabs defaultValue="scores">
        <TabsList>
          <TabsTrigger value="scores">Test Scores</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="mistakes">Mistake Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Performance</CardTitle>
              <CardDescription>Your test scores over time</CardDescription>
            </CardHeader>
            <CardContent>
              {testScores.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={testScores}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#DE0000" name="Score (%)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-12 text-muted-foreground">No test data available yet</p>
              )}
            </CardContent>
          </Card>

          {testScores.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Tests</CardTitle>
                <CardDescription>Your most recent test results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testScores
                    .slice(-5)
                    .reverse()
                    .map((test, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center border-b pb-2 last:border-0 last:pb-0"
                      >
                        <div>
                          <p className="font-medium">{test.name}</p>
                          <p className="text-sm text-muted-foreground">{test.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{test.score}%</p>
                          <p className="text-sm text-muted-foreground">
                            {test.rawScore}/{test.maxScore}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Activity</CardTitle>
              <CardDescription>Your activity over time</CardDescription>
            </CardHeader>
            <CardContent>
              {activityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="tests" fill="#DE0000" name="Tests" />
                    <Bar dataKey="exercises" fill="#FFCE00" name="Exercises" />
                    <Bar dataKey="flashcards" fill="#000000" name="Flashcards" />
                    <Bar dataKey="materials" fill="#666666" name="Study Materials" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-12 text-muted-foreground">No activity data available yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Learning Streak</CardTitle>
              <CardDescription>Your daily learning activity</CardDescription>
            </CardHeader>
            <CardContent>
              {activityData.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 30 }).map((_, index) => {
                    const date = new Date()
                    date.setDate(date.getDate() - (29 - index))
                    const dateString = date.toLocaleDateString()
                    const dayData = activityData.find((d) => d.date === dateString)
                    const totalActivity = dayData
                      ? dayData.tests + dayData.exercises + dayData.flashcards + dayData.materials
                      : 0

                    let bgColor = "bg-gray-100"
                    if (totalActivity > 0) {
                      if (totalActivity < 5) bgColor = "bg-red-200"
                      else if (totalActivity < 10) bgColor = "bg-red-300"
                      else bgColor = "bg-red-500"
                    }

                    return (
                      <div
                        key={index}
                        className={`w-8 h-8 rounded-sm ${bgColor} flex items-center justify-center text-xs`}
                        title={`${dateString}: ${totalActivity} activities`}
                      >
                        {date.getDate()}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center py-12 text-muted-foreground">No streak data available yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mistakes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mistake Analysis</CardTitle>
              <CardDescription>Areas that need improvement</CardDescription>
            </CardHeader>
            <CardContent>
              {mistakeAnalysis && mistakeAnalysis.totalMistakes > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Mistake Categories</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={mistakeAnalysis.categoryCounts}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="category"
                          label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {mistakeAnalysis.categoryCounts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Grammar Points to Focus On</h3>
                    {mistakeAnalysis.recommendedFocus.length > 0 ? (
                      <ul className="space-y-2">
                        {mistakeAnalysis.recommendedFocus.map((point, index) => (
                          <li key={index} className="flex items-center">
                            <span
                              className="inline-block w-4 h-4 rounded-full mr-2"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No specific grammar points to focus on yet</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-center py-12 text-muted-foreground">No mistake data available yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
