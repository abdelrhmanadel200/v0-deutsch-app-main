import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Deutsch Learning Platform</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Register</Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  Learn German Effectively
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Interactive tests, study materials, and progress tracking to help you master the German language.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link href="/register">
                  <Button size="lg">Get Started</Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline">
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-12">
              <Card>
                <CardHeader>
                  <CardTitle>For Students</CardTitle>
                  <CardDescription>Take tests and track your progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Practice with interactive tests</li>
                    <li>Study with comprehensive materials</li>
                    <li>Track your progress over time</li>
                    <li>Get instant feedback on your answers</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/register?role=student" className="w-full">
                    <Button className="w-full">Register as Student</Button>
                  </Link>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>For Teachers</CardTitle>
                  <CardDescription>Create tests and manage courses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Create custom tests for your students</li>
                    <li>Upload study materials</li>
                    <li>Track student performance</li>
                    <li>Manage multiple courses</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/register?role=teacher" className="w-full">
                    <Button className="w-full">Register as Teacher</Button>
                  </Link>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>For Admins</CardTitle>
                  <CardDescription>Manage the entire platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>Manage users and permissions</li>
                    <li>Oversee all courses and tests</li>
                    <li>Access platform analytics</li>
                    <li>Configure system settings</li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/contact" className="w-full">
                    <Button className="w-full" variant="outline">
                      Contact for Admin Access
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} Deutsch Learning Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground underline underline-offset-4">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground underline underline-offset-4">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
