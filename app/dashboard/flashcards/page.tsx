"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-provider"
import { FlashcardSystem } from "@/components/flashcard-system"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

export default function FlashcardsPage() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (profile) {
      fetchCourses()
    }
  }, [profile])

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-6">
          <p className="text-lg font-medium mb-4">No courses available for flashcards</p>
          <Button onClick={fetchCourses}>Refresh</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Flashcards</h1>
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
      </div>

      {selectedCourse && (
        <Card>
          <CardHeader>
            <CardTitle>{courses.find((c) => c.id === selectedCourse)?.title || "Course Flashcards"}</CardTitle>
            <CardDescription>Review flashcards for this course</CardDescription>
          </CardHeader>
          <CardContent>
            <FlashcardSystem courseId={selectedCourse} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
