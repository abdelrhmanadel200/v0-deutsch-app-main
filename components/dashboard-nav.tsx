"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-provider"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
  FileText,
  PenTool,
  BarChart,
  Layers,
  MessageSquare,
  Database,
  ImportIcon as FileImport,
  CheckSquare,
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  roles: Array<"admin" | "teacher" | "student">
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Courses",
    href: "/dashboard/courses",
    icon: <BookOpen className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Tests",
    href: "/dashboard/tests",
    icon: <FileText className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Flashcards",
    href: "/dashboard/flashcards",
    icon: <Layers className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Grammar Exercises",
    href: "/dashboard/grammar",
    icon: <GraduationCap className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Progress Tracking",
    href: "/dashboard/progress",
    icon: <BarChart className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Peer Review",
    href: "/dashboard/peer-review",
    icon: <MessageSquare className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Create Test",
    href: "/dashboard/tests/create",
    icon: <PenTool className="h-5 w-5" />,
    roles: ["admin", "teacher"],
  },
  {
    title: "Question Bank",
    href: "/dashboard/question-bank",
    icon: <Database className="h-5 w-5" />,
    roles: ["admin", "teacher"],
  },
  {
    title: "Content Import/Export",
    href: "/dashboard/content-import",
    icon: <FileImport className="h-5 w-5" />,
    roles: ["admin", "teacher"],
  },
  {
    title: "Bulk Test Grading",
    href: "/dashboard/bulk-grading",
    icon: <CheckSquare className="h-5 w-5" />,
    roles: ["admin", "teacher"],
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: <Users className="h-5 w-5" />,
    roles: ["admin"],
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()

  const filteredNavItems = navItems.filter((item) => profile && item.roles.includes(profile.role))

  return (
    <>
      <nav className="grid gap-2 px-2">
        <Link href="/" className="flex items-center gap-2 px-3 py-2">
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <div className="my-2 h-px bg-muted" />
        {filteredNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground",
              pathname === item.href && "bg-muted text-foreground",
            )}
          >
            {item.icon}
            <span>{item.title}</span>
          </Link>
        ))}
        <div className="my-2 h-px bg-muted" />
        <Button variant="ghost" className="flex items-center gap-2 justify


Let's update the dashboard navigation to include our new features:

```typescriptreact file=\"components/dashboard-nav.tsx"
[v0-no-op-code-block-prefix]"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-provider"
import { Button } from "@/components/ui/button"
import { BookOpen, GraduationCap, Home, LayoutDashboard, LogOut, Settings, Users, FileText, PenTool } from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ReactNode
  roles: Array<"admin" | "teacher" | "student">
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Courses",
    href: "/dashboard/courses",
    icon: <BookOpen className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Tests",
    href: "/dashboard/tests",
    icon: <FileText className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Flashcards",
    href: "/dashboard/flashcards",
    icon: <BookOpen className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Grammar Exercises",
    href: "/dashboard/grammar",
    icon: <GraduationCap className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Progress",
    href: "/dashboard/progress",
    icon: <LayoutDashboard className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Peer Review",
    href: "/dashboard/peer-review",
    icon: <Users className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Question Bank",
    href: "/dashboard/question-bank",
    icon: <FileText className="h-5 w-5" />,
    roles: ["admin", "teacher"],
  },
  {
    title: "Content Import/Export",
    href: "/dashboard/content-import",
    icon: <FileText className="h-5 w-5" />,
    roles: ["admin", "teacher"],
  },
  {
    title: "Bulk Grading",
    href: "/dashboard/bulk-grading",
    icon: <FileText className="h-5 w-5" />,
    roles: ["admin", "teacher"],
  },
  {
    title: "Study Materials",
    href: "/dashboard/materials",
    icon: <GraduationCap className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
  {
    title: "Create Test",
    href: "/dashboard/tests/create",
    icon: <PenTool className="h-5 w-5" />,
    roles: ["admin", "teacher"],
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: <Users className="h-5 w-5" />,
    roles: ["admin"],
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
    roles: ["admin", "teacher", "student"],
  },
]

export function DashboardNav() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()

  const filteredNavItems = navItems.filter((item) => profile && item.roles.includes(profile.role))

  return (
    <nav className="grid gap-2 px-2">
      <Link href="/" className="flex items-center gap-2 px-3 py-2">
        <Home className="h-5 w-5" />
        <span>Home</span>
      </Link>
      <div className="my-2 h-px bg-muted" />
      {filteredNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground",
            pathname === item.href && "bg-muted text-foreground",
          )}
        >
          {item.icon}
          <span>{item.title}</span>
        </Link>
      ))}
      <div className="my-2 h-px bg-muted" />
      <Button variant="ghost" className="flex items-center gap-2 justify-start px-3 py-2" onClick={signOut}>
        <LogOut className="h-5 w-5" />
        <span>Logout</span>
      </Button>
    </nav>
  )
}
