"use client"

import { BulkTestGrader } from "@/components/bulk-test-grader"

export default function BulkGradingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Bulk Test Grading</h1>
      </div>

      <BulkTestGrader />
    </div>
  )
}
