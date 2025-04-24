"use client"

import { ProgressVisualization } from "@/components/progress-visualization"

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Progress Tracking</h1>
      </div>

      <ProgressVisualization />
    </div>
  )
}
