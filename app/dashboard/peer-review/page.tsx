"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-provider"
import { PeerReview } from "@/components/peer-review"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"

export default function PeerReviewPage() {
  const { profile } = useAuth()
  const [submissions, setSubmissions] = useState<any[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (profile) {
      fetchSubmissions()
    }
  }, [profile])

  const fetchSubmissions = async () => {
    setIsLoading(true)
    try {
      // Get submissions that need review
      // Exclude user's own submissions and ones they've already reviewed
      const { data, error } = await supabase
        .from("writing_submissions")
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          ),
          writing_assignments:assignment_id (
            title
          )
        `)
        .neq("user_id", profile.id)
        .eq("status", "pending_review")
        .not("id", "in", supabase.from("peer_reviews").select("submission_id").eq("reviewer_id", profile.id))
        .order("created_at", { ascending: false })

      if (error) throw error

      setSubmissions(data || [])

      if (data && data.length > 0) {
        setSelectedSubmission(data[0].id)
      } else {
        setSelectedSubmission(null)
      }
    } catch (error) {
      console.error("Error fetching submissions:", error)
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReviewComplete = () => {
    // Remove the reviewed submission from the list
    setSubmissions(submissions.filter((s) => s.id !== selectedSubmission))

    // Select the next submission if available
    if (submissions.length > 1) {
      const nextSubmission = submissions.find((s) => s.id !== selectedSubmission)
      if (nextSubmission) {
        setSelectedSubmission(nextSubmission.id)
      } else {
        setSelectedSubmission(null)
      }
    } else {
      setSelectedSubmission(null)
    }

    toast({
      title: "Review Submitted",
      description: "Thank you for your feedback!",
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Peer Review</h1>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-lg font-medium mb-4">No submissions available for review</p>
            <Button onClick={fetchSubmissions}>Refresh</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Peer Review</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Select value={selectedSubmission || ""} onValueChange={(value) => setSelectedSubmission(value || null)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a submission" />
            </SelectTrigger>
            <SelectContent>
              {submissions.map((submission) => (
                <SelectItem key={submission.id} value={submission.id}>
                  {submission.writing_assignments?.title} - {submission.profiles?.first_name}{" "}
                  {submission.profiles?.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedSubmission && <PeerReview submissionId={selectedSubmission} onComplete={handleReviewComplete} />}
    </div>
  )
}
