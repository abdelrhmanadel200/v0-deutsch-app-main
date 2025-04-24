"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-provider"
import { createClientSupabaseClient } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, FileText, GraduationCap, Users } from "lucide-react"

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    courses: 0,
    tests: 0,
    materials: 0,
    users: 0,
  })
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile) return

      setIsLoading(true)

      try {
        // Fetch stats based on user role
        if (profile.role === "admin") {
          const [coursesRes, testsRes, materialsRes, usersRes] = await Promise.all([
            supabase.from("courses").select("id", { count: "exact" }),
            supabase.from("tests").select("id", { count: "exact" }),
            supabase.from("study_materials").select("id", { count: "exact" }),
            supabase.from("profiles").select("id", { count: "exact" }),
          ])

          setStats({
            courses: coursesRes.count || 0,
            tests: testsRes.count || 0,
            materials: materialsRes.count || 0,
            users: usersRes.count || 0,
          })
        } else if (profile.role === "teacher") {
          const [coursesRes, testsRes, materialsRes, studentsRes] = await Promise.all([
            supabase.from("courses").select("id", { count: "exact" }).eq("teacher_id", profile.id),
            supabase.from("tests").select("id", { count: "exact" }).eq("created_by", profile.id),
            supabase.from("study_materials").select("id", { count: "exact" }).eq("created_by", profile.id),
            supabase
              .from("enrollments")
              .select("student_id", { count: "exact", distinct: true })
              .in("course_id", supabase.from("courses").select("id").eq("teacher_id", profile.id)),
          ])

          setStats({
            courses: coursesRes.count || 0,
            tests: testsRes.count || 0,
            materials: materialsRes.count || 0,
            users: studentsRes.count || 0,
          })
        } else {
          // Student
          const [coursesRes, testsRes, materialsRes, completedTestsRes] = await Promise.all([
            supabase.from("enrollments").select("id", { count: "exact" }).eq("student_id", profile.id),
            supabase
              .from("tests")
              .select("id", { count: "exact" })
              .in("course_id", supabase.from("enrollments").select("course_id").eq("student_id", profile.id)),
            supabase
              .from("study_materials")
              .select("id", { count: "exact" })
              .in("course_id", supabase.from("enrollments").select("course_id").eq("student_id", profile.id)),
            supabase
              .from("test_attempts")
              .select("id", { count: "exact" })
              .eq("student_id", profile.id)
              .not("completed_at", "is", null),
          ])

          setStats({
            courses: coursesRes.count || 0,
            tests: testsRes.count || 0,
            materials: materialsRes.count || 0,
            users: completedTestsRes.count || 0,
          })
        }

        // Fetch recent activity
        let query
        if (profile.role === "admin") {
          query = supabase
            .from("test_attempts")
            .select(`
              id, 
              started_at, 
              completed_at, 
              score, 
              max_score,
              tests(title),
              profiles(first_name, last_name)
            `)
            .order("started_at", { ascending: false })
            .limit(5)
        } else if (profile.role === "teacher") {
          query = supabase
            .from("test_attempts")
            .select(`
              id, 
              started_at, 
              completed_at, 
              score, 
              max_score,
              tests(title, course_id),
              profiles(first_name, last_name)
            `)
            .in("tests.course_id", supabase.from("courses").select("id").eq("teacher_id", profile.id))
            .order("started_at", { ascending: false })
            .limit(5)
        } else {
          query = supabase
            .from("test_attempts")
            .select(`
              id, 
              started_at, 
              completed_at, 
              score, 
              max_score,
              tests(title)
            `)
            .eq("student_id", profile.id)
            .order("started_at", { ascending: false })
            .limit(5)
        }

        const { data: activity } = await query
        setRecentActivity(activity || [])
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [profile, supabase])

  if (!profile) return null

  const roleLabel = profile.role.charAt(0).toUpperCase() + profile.role.slice(1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Role:</span>
          <span className="font-medium text-foreground">{roleLabel}</span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {profile.role === "student" ? "Enrolled Courses" : "Courses"}
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.courses}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {profile.role === "student" ? "Available Tests" : "Tests Created"}
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.tests}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {profile.role === "student" ? "Study Materials" : "Materials Created"}
                </CardTitle>
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.materials}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {profile.role === "admin"
                    ? "Total Users"
                    : profile.role === "teacher"
                      ? "Students"
                      : "Completed Tests"}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? "..." : stats.users}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                {profile.role === "student"
                  ? "Your recent test attempts"
                  : profile.role === "teacher"
                    ? "Recent test attempts by your students"
                    : "Recent test attempts across the platform"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <p className="font-medium">{activity.tests?.title}</p>
                        {profile.role !== "student" && activity.profiles && (
                          <p className="text-sm text-muted-foreground">
                            {activity.profiles.first_name} {activity.profiles.last_name}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {new Date(activity.started_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        {activity.completed_at ? (
                          <div className="space-y-1">
                            <p className="font-medium">
                              {activity.score}/{activity.max_score}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {Math.round((activity.score / activity.max_score) * 100)}%
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">In progress</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground">No recent activity found</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
