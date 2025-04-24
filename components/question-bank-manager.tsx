"use client"

import { useState, useEffect } from "react"
import { createClientSupabaseClient } from "@/lib/supabase"
import { useAuth } from "@/lib/auth-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Plus, Search, Trash } from "lucide-react"

export function QuestionBankManager() {
  const { profile } = useAuth()
  const [banks, setBanks] = useState([])
  const [questions, setQuestions] = useState([])
  const [selectedBank, setSelectedBank] = useState(null)
  const [selectedQuestions, setSelectedQuestions] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [newBankName, setNewBankName] = useState("")
  const [newBankDescription, setNewBankDescription] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterDifficulty, setFilterDifficulty] = useState(null)
  const [filterCategory, setFilterCategory] = useState(null)
  const [categories, setCategories] = useState([])
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (profile) {
      fetchQuestionBanks()
    }
  }, [profile])

  useEffect(() => {
    if (selectedBank) {
      fetchBankQuestions()
    } else {
      fetchAllQuestions()
    }
  }, [selectedBank, searchQuery, filterDifficulty, filterCategory])

  const fetchQuestionBanks = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("question_banks")
        .select("*")
        .or(`created_by.eq.${profile.id},is_public.eq.true`)
        .order("created_at", { ascending: false })

      if (error) throw error

      setBanks(data || [])
    } catch (error) {
      console.error("Error fetching question banks:", error)
      toast({
        title: "Error",
        description: "Failed to load question banks",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAllQuestions = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from("questions")
        .select(`
          *,
          tests (
            title
          )
        `)
        .order("created_at", { ascending: false })

      if (searchQuery) {
        query = query.ilike("question_text", `%${searchQuery}%`)
      }

      if (filterDifficulty) {
        query = query.eq("difficulty", filterDifficulty)
      }

      if (filterCategory) {
        query = query.eq("category", filterCategory)
      }

      const { data, error } = await query

      if (error) throw error

      setQuestions(data || [])

      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map((q) => q.category).filter(Boolean))]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error("Error fetching questions:", error)
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchBankQuestions = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from("questions")
        .select(`
          *,
          tests (
            title
          )
        `)
        .in("id", supabase.from("question_bank_items").select("question_id").eq("bank_id", selectedBank))
        .order("created_at", { ascending: false })

      if (searchQuery) {
        query = query.ilike("question_text", `%${searchQuery}%`)
      }

      if (filterDifficulty) {
        query = query.eq("difficulty", filterDifficulty)
      }

      if (filterCategory) {
        query = query.eq("category", filterCategory)
      }

      const { data, error } = await query

      if (error) throw error

      setQuestions(data || [])

      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map((q) => q.category).filter(Boolean))]
      setCategories(uniqueCategories)
    } catch (error) {
      console.error("Error fetching bank questions:", error)
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createQuestionBank = async () => {
    if (!newBankName || !profile) return

    setIsCreating(true)

    try {
      const { data, error } = await supabase
        .from("question_banks")
        .insert({
          name: newBankName,
          description: newBankDescription,
          created_by: profile.id,
          is_public: isPublic,
        })
        .select()
        .single()

      if (error) throw error

      setBanks([data, ...banks])
      setNewBankName("")
      setNewBankDescription("")
      setIsPublic(false)
      setIsDialogOpen(false)

      toast({
        title: "Success",
        description: "Question bank created successfully",
      })
    } catch (error) {
      console.error("Error creating question bank:", error)
      toast({
        title: "Error",
        description: "Failed to create question bank",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const addQuestionsToBank = async () => {
    if (!selectedBank || selectedQuestions.length === 0) return

    try {
      // Create array of objects for insertion
      const items = selectedQuestions.map((questionId) => ({
        bank_id: selectedBank,
        question_id: questionId,
      }))

      const { error } = await supabase.from("question_bank_items").upsert(items)

      if (error) throw error

      setSelectedQuestions([])

      toast({
        title: "Success",
        description: `${selectedQuestions.length} questions added to bank`,
      })

      // Refresh questions
      fetchBankQuestions()
    } catch (error) {
      console.error("Error adding questions to bank:", error)
      toast({
        title: "Error",
        description: "Failed to add questions to bank",
        variant: "destructive",
      })
    }
  }

  const removeQuestionsFromBank = async () => {
    if (!selectedBank || selectedQuestions.length === 0) return

    try {
      const { error } = await supabase
        .from("question_bank_items")
        .delete()
        .eq("bank_id", selectedBank)
        .in("question_id", selectedQuestions)

      if (error) throw error

      setSelectedQuestions([])

      toast({
        title: "Success",
        description: `${selectedQuestions.length} questions removed from bank`,
      })

      // Refresh questions
      fetchBankQuestions()
    } catch (error) {
      console.error("Error removing questions from bank:", error)
      toast({
        title: "Error",
        description: "Failed to remove questions from bank",
        variant: "destructive",
      })
    }
  }

  const handleQuestionSelect = (questionId) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId],
    )
  }

  const handleSelectAll = () => {
    if (selectedQuestions.length === questions.length) {
      setSelectedQuestions([])
    } else {
      setSelectedQuestions(questions.map((q) => q.id))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full">
          <Select value={selectedBank || ""} onValueChange={(value) => setSelectedBank(value || null)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a question bank" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Questions</SelectItem>
              {banks.map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Bank
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Question Bank</DialogTitle>
              <DialogDescription>Create a new question bank to organize your questions</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="German Grammar Questions"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newBankDescription}
                  onChange={(e) => setNewBankDescription(e.target.value)}
                  placeholder="Questions about German grammar rules"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="public" checked={isPublic} onCheckedChange={(checked) => setIsPublic(checked === true)} />
                <Label htmlFor="public">Make this question bank public</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createQuestionBank} disabled={!newBankName || isCreating}>
                {isCreating ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={filterDifficulty || ""} onValueChange={(value) => setFilterDifficulty(value || null)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Difficulties</SelectItem>
            <SelectItem value="1">1 - Very Easy</SelectItem>
            <SelectItem value="2">2 - Easy</SelectItem>
            <SelectItem value="3">3 - Medium</SelectItem>
            <SelectItem value="4">4 - Hard</SelectItem>
            <SelectItem value="5">5 - Very Hard</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory || ""} onValueChange={(value) => setFilterCategory(value || null)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedQuestions.length > 0 && (
        <div className="flex items-center justify-between bg-muted p-2 rounded-md">
          <span>{selectedQuestions.length} questions selected</span>
          <div className="space-x-2">
            {selectedBank && (
              <Button variant="destructive" size="sm" onClick={removeQuestionsFromBank}>
                <Trash className="mr-2 h-4 w-4" />
                Remove from Bank
              </Button>
            )}
            {!selectedBank && (
              <Select
                onValueChange={(value) => {
                  if (value) {
                    setSelectedBank(value)
                    addQuestionsToBank()
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Add to Bank" />
                </SelectTrigger>
                <SelectContent>
                  {banks.map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {selectedBank ? banks.find((b) => b.id === selectedBank)?.name || "Question Bank" : "All Questions"}
          </CardTitle>
          <CardDescription>
            {selectedBank
              ? banks.find((b) => b.id === selectedBank)?.description || "Questions in this bank"
              : "All available questions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : questions.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 pb-2 border-b">
                <Checkbox
                  id="select-all"
                  checked={selectedQuestions.length === questions.length && questions.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label htmlFor="select-all" className="font-medium">
                  Select All
                </Label>
              </div>

              {questions.map((question) => (
                <div key={question.id} className="flex items-start space-x-2 p-2 hover:bg-muted/50 rounded-md">
                  <Checkbox
                    id={question.id}
                    checked={selectedQuestions.includes(question.id)}
                    onCheckedChange={() => handleQuestionSelect(question.id)}
                    className="mt-1"
                  />
                  <div className="space-y-1 flex-1">
                    <Label htmlFor={question.id} className="font-medium cursor-pointer">
                      {question.question_text}
                    </Label>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {question.tests?.title && <span>Test: {question.tests.title}</span>}
                      {question.difficulty && <span>Difficulty: {question.difficulty}</span>}
                      {question.category && <span>Category: {question.category}</span>}
                      {question.grammar_point && <span>Grammar: {question.grammar_point}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No questions found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
