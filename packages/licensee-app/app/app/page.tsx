import { WaitlistForm } from '@/components/waitlist-form'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Join the Waitlist
          </h1>
          <p className="mt-2 text-lg text-slate-600">
            Get early access to our branded platform
          </p>
          <div className="mt-4 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            Licensed Platform • 94% Revenue Share
          </div>
        </div>
        <WaitlistForm />
      </div>
    </main>
  )
}
