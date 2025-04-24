"use client"

import type React from "react"

import { useState } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { toast } from "@/components/ui/use-toast"
import { Upload, Download } from "lucide-react"

export function ContentImporter() {
  const { profile } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [importType, setImportType] = useState<"questions" | "flashcards" | "exercises">("questions")
  const [isImporting, setIsImporting] = useState(false)
  const [exportCourseId, setExportCourseId] = useState("")
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json")
  const [isExporting, setIsExporting] = useState(false)
  const supabase = createClientSupabaseClient()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleImport = async () => {
    if (!file || !profile) return

    setIsImporting(true)

    try {
      const content = await readFileAsText(file)
      let data

      try {
        data = JSON.parse(content)
      } catch (error) {
        throw new Error("Invalid JSON file")
      }

      // Process import based on type
      switch (importType) {
        case "questions":
          await importQuestions(data)
          break
        case "flashcards":
          await importFlashcards(data)
          break
        case "exercises":
          await importExercises(data)
          break
      }

      toast({
        title: "Success",
        description: `${importType} imported successfully`,
      })

      // Reset form
      setFile(null)
      if (document.getElementById("file-input") as HTMLInputElement) {
        ;(document.getElementById("file-input") as HTMLInputElement).value = ""
      }
    } catch (error) {
      console.error("Error importing content:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to import content",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target) {
          resolve(event.target.result as string)
        } else {
          reject(new Error("Failed to read file"))
        }
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }

  const importQuestions = async (data: any) => {
    if (!Array.isArray(data.questions)) {
      throw new Error("Invalid questions format")
    }

    // Validate required fields
    for (const question of data.questions) {
      if (!question.question_text || !question.question_type || !Array.isArray(question.answers)) {
        throw new Error("Invalid question format")
      }
    }

    // Create test if provided
    let testId = data.test_id

    if (!testId && data.test) {
      const { data: testData, error: testError } = await supabase
        .from("tests")
        .insert({
          title: data.test.title,
          description: data.test.description,
          course_id: data.test.course_id,
          created_by: profile.id,
          time_limit: data.test.time_limit,
          is_published: false,
        })
        .select()
        .single()

      if (testError) throw testError

      testId = testData.id
    }

    // Insert questions
    for (const question of data.questions) {
      const { data: questionData, error: questionError } = await supabase
        .from("questions")
        .insert({
          test_id: testId,
          question_text: question.question_text,
          question_type: question.question_type,
          points: question.points || 1,
          difficulty: question.difficulty || 3.0,
          category: question.category,
          grammar_point: question.grammar_point,
        })
        .select()
        .single()

      if (questionError) throw questionError

      // Insert answers
      const answersToInsert = question.answers.map((answer) => ({
        question_id: questionData.id,
        answer_text: answer.answer_text,
        is_correct: answer.is_correct || false,
      }))

      const { error: answersError } = await supabase.from("answers").insert(answersToInsert)

      if (answersError) throw answersError
    }
  }

  const importFlashcards = async (data: any) => {
    if (!Array.isArray(data.flashcards)) {
      throw new Error("Invalid flashcards format")
    }

    // Validate required fields
    for (const flashcard of data.flashcards) {
      if (!flashcard.german_word || !flashcard.translation) {
        throw new Error("Invalid flashcard format")
      }
    }

    // Insert flashcards
    const flashcardsToInsert = data.flashcards.map((flashcard) => ({
      course_id: data.course_id,
      created_by: profile.id,
      german_word: flashcard.german_word,
      translation: flashcard.translation,
      example_sentence: flashcard.example_sentence,
      image_url: flashcard.image_url,
      audio_url: flashcard.audio_url,
      tags: flashcard.tags,
    }))

    const { error } = await supabase.from("flashcards").insert(flashcardsToInsert)

    if (error) throw error
  }

  const importExercises = async (data: any) => {
    if (!Array.isArray(data.exercises)) {
      throw new Error("Invalid exercises format")
    }

    // Validate required fields
    for (const exercise of data.exercises) {
      if (!exercise.exercise_type || !exercise.instructions || !exercise.content || !exercise.solution) {
        throw new Error("Invalid exercise format")
      }
    }

    // Insert exercises
    const exercisesToInsert = data.exercises.map((exercise) => ({
      course_id: data.course_id,
      created_by: profile.id,
      exercise_type: exercise.exercise_type,
      difficulty_level: exercise.difficulty_level || "medium",
      instructions: exercise.instructions,
      content: exercise.content,
      solution: exercise.solution,
      explanation: exercise.explanation,
      grammar_point: exercise.grammar_point,
    }))

    const { error } = await supabase.from("grammar_exercises").insert(exercisesToInsert)

    if (error) throw error
  }

  const handleExport = async () => {
    if (!exportCourseId || !profile) return

    setIsExporting(true)

    try {
      // Fetch course data with related content
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", exportCourseId)
        .single()

      if (courseError) throw courseError

      // Fetch tests
      const { data: tests, error: testsError } = await supabase
        .from("tests")
        .select(`
          *,
          questions (
            *,
            answers (*)
          )
        `)
        .eq("course_id", exportCourseId)

      if (testsError) throw testsError

      // Fetch flashcards
      const { data: flashcards, error: flashcardsError } = await supabase
        .from("flashcards")
        .select("*")
        .eq("course_id", exportCourseId)

      if (flashcardsError) throw flashcardsError

      // Fetch exercises
      const { data: exercises, error: exercisesError } = await supabase
        .from("grammar_exercises")
        .select("*")
        .eq("course_id", exportCourseId)

      if (exercisesError) throw exercisesError

      // Fetch study materials
      const { data: materials, error: materialsError } = await supabase
        .from("study_materials")
        .select("*")
        .eq("course_id", exportCourseId)

      if (materialsError) throw materialsError

      // Create export data
      const exportData = {
        course,
        tests: tests || [],
        flashcards: flashcards || [],
        exercises: exercises || [],
        materials: materials || [],
      }

      // Create file for download
      let blob, filename

      if (exportFormat === "json") {
        blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
        filename = `course_${exportCourseId}.json`
      } else {
        // CSV export would require conversion logic
        // This is a simplified example
        const csvContent = convertToCSV(exportData)
        blob = new Blob([csvContent], { type: "text/csv" })
        filename = `course_${exportCourseId}.csv`
      }

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Success",
        description: "Course exported successfully",
      })
    } catch (error) {
      console.error("Error exporting course:", error)
      toast({
        title: "Error",
        description: "Failed to export course",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const convertToCSV = (data: any) => {
    // This is a placeholder for actual CSV conversion logic
    // In a real implementation, you would convert the data to CSV format
    return "id,name,description\n" + data.course.id + "," + data.course.title + "," + data.course.description
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Import Content</CardTitle>
          <CardDescription>Import questions, flashcards, or exercises from JSON</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-type">Content Type</Label>
            <RadioGroup
              value={importType}
              onValueChange={(value) => setImportType(value as any)}
              className="flex flex-col space-y-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="questions" id="questions" />
                <Label htmlFor="questions">Questions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="flashcards" id="flashcards" />
                <Label htmlFor="flashcards">Flashcards</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="exercises" id="exercises" />
                <Label htmlFor="exercises">Grammar Exercises</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-input">Select File</Label>
            <Input id="file-input" type="file" accept=".json" onChange={handleFileChange} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleImport} disabled={!file || isImporting} className="w-full">
            {isImporting ? (
              <>Importing...</>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Content</CardTitle>
          <CardDescription>Export course content to JSON or CSV</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="course-id">Course ID</Label>
            <Input
              id="course-id"
              value={exportCourseId}
              onChange={(e) => setExportCourseId(e.target.value)}
              placeholder="Enter course ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-format">Export Format</Label>
            <RadioGroup
              value={exportFormat}
              onValueChange={(value) => setExportFormat(value as any)}
              className="flex space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json">JSON</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv">CSV</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleExport} disabled={!exportCourseId || isExporting} className="w-full">
            {isExporting ? (
              <>Exporting...</>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
