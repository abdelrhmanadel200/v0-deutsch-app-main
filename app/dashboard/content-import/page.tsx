"use client"

import { ContentImporter } from "@/components/content-importer"

export default function ContentImportPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Content Import/Export</h1>
      </div>

      <ContentImporter />
    </div>
  )
}
