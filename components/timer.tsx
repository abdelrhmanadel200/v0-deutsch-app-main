"use client"

import { useState, useEffect } from "react"
import { AlertCircle } from "lucide-react"

type TimerProps = {
  initialTime: number // in seconds
  onTimeUp: () => void
}

export function Timer({ initialTime, onTimeUp }: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          onTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [onTimeUp])

  // Format time as mm:ss
  const minutes = Math.floor(timeRemaining / 60)
  const seconds = timeRemaining % 60

  // Warning when less than 1 minute remains
  const isWarning = timeRemaining < 60

  return (
    <div className={`flex items-center ${isWarning ? "text-red-500" : ""}`}>
      {isWarning && <AlertCircle className="mr-1 h-4 w-4" />}
      <span className="font-mono">
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  )
}
