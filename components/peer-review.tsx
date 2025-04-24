"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"

type PeerReviewProps = {
  submissionId: string
  onComplete?: () => void
}

export function PeerReview({ submissionId, onComplete }: PeerReviewProps) {
  const { profile } = useAuth()
  const [submission, setSubmission] = useState<any>(null)
  const [feedback, setFeedback] = useState("")
  const [rating, setRating] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    fetchSubmission()
  }, [submissionId])

  const fetchSubmission = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("writing_submissions")
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name
          ),
          writing_assignments:assignment_id (
            title,
            instructions
          )
        `)
        .eq("id", submissionId)
        .single()

      if (error) throw error

      setSubmission(data)
    } catch (error) {
      console.error("Error fetching submission:", error)
      toast({
        title: "Error",
        description: "Failed to load submission",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!feedback || !rating || !profile) return

    setIsSubmitting(true)

    try {
      // Submit peer review
      await supabase.from("peer_reviews").insert({
        submission_id: submissionId,
        reviewer_id: profile.id,
        content: feedback,
        rating,
      })

      toast({
        title: "Success",
        description: "Your review has been submitted",
      })

      if (onComplete) {
        onComplete()
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!submission) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Submission not found</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Peer Review</CardTitle>
        <CardDescription>Review submission for {submission.writing_assignments?.title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Assignment</h3>
          <p>{submission.writing_assignments?.instructions}</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Submission</h3>
          <div className="rounded-md border p-4 bg-muted/50">
            <p className="whitespace-pre-wrap">{submission.content}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Your Feedback</h3>
          <Textarea
            placeholder="Provide constructive feedback..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={6}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-medium">Rating</h3>
          <RadioGroup value={rating?.toString() || ""} onValueChange={(value) => setRating(Number.parseInt(value))}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="1" id="r1" />
              <Label htmlFor="r1">1 - Poor</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="2" id="r2" />
              <Label htmlFor="r2">2 - Fair</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="3" id="r3" />
              <Label htmlFor="r3">3 - Good</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="4" id="r4" />
              <Label htmlFor="r4">4 - Very Good</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="5" id="r5" />
              <Label htmlFor="r5">5 - Excellent</Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} disabled={!feedback || !rating || isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </Button>
      </CardFooter>
    </Card>
  )
}
