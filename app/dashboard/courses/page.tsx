"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-provider"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Plus, Search } from "lucide-react"

type Course = {
  id: string
  title: string
  description: string | null
  level: string | null
  teacher_id: string
  created_at: string
  teacher_name?: string
  enrolled?: boolean
  student_count?: number
}

export default function CoursesPage() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const fetchCourses = async () => {
      if (!profile) return

      setIsLoading(true)

      try {
        let query

        if (profile.role === "admin") {
          // Admin sees all courses with teacher names
          const { data } = await supabase
            .from("courses")
            .select(`
              *,
              profiles:teacher_id (first_name, last_name),
              enrollments:enrollments (student_id)
            `)
            .order("created_at", { ascending: false })

          if (data) {
            setCourses(
              data.map((course) => ({
                ...course,
                teacher_name: course.profiles
                  ? `${course.profiles.first_name} ${course.profiles.last_name}`
                  : "Unknown",
                student_count: course.enrollments ? course.enrollments.length : 0,
              })),
            )
          }
        } else if (profile.role === "teacher") {
          // Teacher sees their own courses
          const { data } = await supabase
            .from("courses")
            .select(`
              *,
              enrollments:enrollments (student_id)
            `)
            .eq("teacher_id", profile.id)
            .order("created_at", { ascending: false })

          if (data) {
            setCourses(
              data.map((course) => ({
                ...course,
                student_count: course.enrollments ? course.enrollments.length : 0,
              })),
            )
          }
        } else {
          // Student sees enrolled courses and available courses
          const { data: enrolledData } = await supabase
            .from("enrollments")
            .select(`
              course_id,
              courses:course_id (
                *,
                profiles:teacher_id (first_name, last_name)
              )
            `)
            .eq("student_id", profile.id)

          const enrolledCourseIds = enrolledData?.map((item) => item.course_id) || []

          const { data: allCoursesData } = await supabase
            .from("courses")
            .select(`
              *,
              profiles:teacher_id (first_name, last_name)
            `)
            .order("created_at", { ascending: false })

          if (allCoursesData) {
            setCourses(
              allCoursesData.map((course) => ({
                ...course,
                teacher_name: course.profiles
                  ? `${course.profiles.first_name} ${course.profiles.last_name}`
                  : "Unknown",
                enrolled: enrolledCourseIds.includes(course.id),
              })),
            )
          }
        }
      } catch (error) {
        console.error("Error fetching courses:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCourses()
  }, [profile, supabase])

  const filteredCourses = courses.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.description && course.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (course.teacher_name && course.teacher_name.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const enrolledCourses = filteredCourses.filter((course) => course.enrolled)
  const availableCourses = filteredCourses.filter((course) => !course.enrolled)

  const handleEnroll = async (courseId: string) => {
    if (!profile) return

    try {
      await supabase.from("enrollments").insert({
        student_id: profile.id,
        course_id: courseId,
      })

      setCourses(courses.map((course) => (course.id === courseId ? { ...course, enrolled: true } : course)))
    } catch (error) {
      console.error("Error enrolling in course:", error)
    }
  }

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
        {(profile.role === "admin" || profile.role === "teacher") && (
          <Link href="/dashboard/courses/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          </Link>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : profile.role === "student" ? (
        <Tabs defaultValue="enrolled" className="space-y-6">
          <TabsList>
            <TabsTrigger value="enrolled">Enrolled Courses</TabsTrigger>
            <TabsTrigger value="available">Available Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="enrolled" className="space-y-6">
            {enrolledCourses.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {enrolledCourses.map((course) => (
                  <CourseCard key={course.id} course={course} userRole={profile.role} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No enrolled courses</h3>
                <p className="mt-2 text-sm text-muted-foreground">You haven&apos;t enrolled in any courses yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="available" className="space-y-6">
            {availableCourses.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {availableCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    userRole={profile.role}
                    onEnroll={() => handleEnroll(course.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No available courses</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  There are no additional courses available at the moment.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          {filteredCourses.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} userRole={profile.role} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No courses found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {profile.role === "teacher"
                  ? "You haven't created any courses yet."
                  : "No courses match your search criteria."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CourseCard({
  course,
  userRole,
  onEnroll,
}: {
  course: Course
  userRole: string
  onEnroll?: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{course.title}</CardTitle>
        <CardDescription>
          {course.level && <span>Level: {course.level}</span>}
          {course.teacher_name && <span className="block">Teacher: {course.teacher_name}</span>}
          {course.student_count !== undefined && <span className="block">Students: {course.student_count}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {course.description || "No description available."}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Link href={`/dashboard/courses/${course.id}`}>
          <Button variant="outline">View Details</Button>
        </Link>
        {userRole === "student" && !course.enrolled && onEnroll && <Button onClick={onEnroll}>Enroll</Button>}
        {(userRole === "admin" || userRole === "teacher") && (
          <Link href={`/dashboard/courses/${course.id}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  )
}
