import Link from "next/link"

export function AuthHeader() {
  return (
    <div className="text-center mb-8">
      <Link href="/" className="inline-block">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">AI</span>
          </div>
          <span className="text-xl font-bold text-slate-900 dark:text-white">AI Gym 24/7</span>
        </div>
      </Link>
    </div>
  )
}
