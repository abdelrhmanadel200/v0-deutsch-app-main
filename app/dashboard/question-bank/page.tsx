"use client"

import { QuestionBankManager } from "@/components/question-bank-manager"

export default function QuestionBankPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
      </div>

      <QuestionBankManager />
    </div>
  )
}
