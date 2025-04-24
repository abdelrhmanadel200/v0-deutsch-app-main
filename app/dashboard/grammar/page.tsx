"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-provider"
import { GrammarExercise } from "@/components/grammar-exercise"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

export default function GrammarPage() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<any[]>([])
  const [exercises, setExercises] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (profile) {
      fetchCourses()
    }
  }, [profile])

  useEffect(() => {
    if (selectedCourse) {
      fetchExercises()
    }
  }, [selectedCourse])

  const fetchCourses = async () => {
    setIsLoading(true)
    try {
      let query

      if (profile.role === "student") {
        // Students see enrolled courses
        query = supabase
          .from("enrollments")
          .select(`
            course_id,
            courses:course_id (
              id,
              title,
              description
            )
          `)
          .eq("student_id", profile.id)
      } else if (profile.role === "teacher") {
        // Teachers see their courses
        query = supabase.from("courses").select("id, title, description").eq("teacher_id", profile.id)
      } else {
        // Admins see all courses
        query = supabase.from("courses").select("id, title, description")
      }

      const { data, error } = await query

      if (error) throw error

      const formattedCourses = profile.role === "student" ? data.map((item) => item.courses) : data

      setCourses(formattedCourses)

      if (formattedCourses.length > 0) {
        setSelectedCourse(formattedCourses[0].id)
      }
    } catch (error) {
      console.error("Error fetching courses:", error)
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchExercises = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("grammar_exercises")
        .select("*")
        .eq("course_id", selectedCourse)
        .order("created_at", { ascending: false })

      if (error) throw error

      setExercises(data || [])

      if (data && data.length > 0) {
        setSelectedExercise(data[0].id)
      } else {
        setSelectedExercise(null)
      }
    } catch (error) {
      console.error("Error fetching exercises:", error)
      toast({
        title: "Error",
        description: "Failed to load grammar exercises",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleExerciseComplete = async (result) => {
    try {
      if (profile) {
        // Add to user progress
        await supabase.from("user_progress").insert({
          user_id: profile.id,
          activity_type: "exercises",
          activity_id: selectedExercise,
          score: result.correct ? 1 : 0,
          max_score: 1,
          time_spent: result.timeSpent,
          completed_at: new Date().toISOString(),
        })
      }

      toast({
        title: result.correct ? "Correct!" : "Incorrect",
        description: result.correct ? "Great job! Try another exercise." : "Don't worry, practice makes perfect.",
        variant: result.correct ? "default" : "destructive",
      })
    } catch (error) {
      console.error("Error saving progress:", error)
    }
  }

  if (isLoading && courses.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Grammar Exercises</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Select value={selectedCourse || ""} onValueChange={(value) => setSelectedCourse(value || null)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {exercises.length > 0 && (
          <div className="flex-1">
            <Select value={selectedExercise || ""} onValueChange={(value) => setSelectedExercise(value || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Select an exercise" />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.grammar_point}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {selectedCourse && exercises.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-lg font-medium mb-4">No grammar exercises available for this course</p>
            <Button onClick={fetchExercises}>Refresh</Button>
          </CardContent>
        </Card>
      )}

      {selectedExercise && <GrammarExercise exerciseId={selectedExercise} onComplete={handleExerciseComplete} />}
    </div>
  )
}
