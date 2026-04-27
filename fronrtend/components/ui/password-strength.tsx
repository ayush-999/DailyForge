export function getPasswordStrength(pass: string) {
  let score = 0
  if (!pass) return score
  if (pass.length >= 8) score += 1
  if (/[A-Z]/.test(pass)) score += 1
  if (/[a-z]/.test(pass)) score += 1
  if (/[0-9]/.test(pass)) score += 1
  if (/[^A-Za-z0-9]/.test(pass)) score += 1
  return Math.min(4, score)
}

function getStrengthColor(score: number) {
  switch (score) {
    case 0:
      return "bg-zinc-200 dark:bg-zinc-800"
    case 1:
      return "bg-red-500"
    case 2:
      return "bg-orange-500"
    case 3:
      return "bg-yellow-500"
    case 4:
      return "bg-emerald-500"
    default:
      return "bg-zinc-200 dark:bg-zinc-800"
  }
}

function getStrengthText(score: number) {
  switch (score) {
    case 0:
      return ""
    case 1:
      return "Weak"
    case 2:
      return "Fair"
    case 3:
      return "Good"
    case 4:
      return "Strong"
    default:
      return ""
  }
}

interface PasswordStrengthProps {
  password?: string
  score?: number
}

export function PasswordStrength({ password, score }: PasswordStrengthProps) {
  const strength =
    score !== undefined ? score : getPasswordStrength(password || "")

  if (strength === 0 && !password) return null

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`h-1.5 w-full rounded-full transition-colors duration-300 ${
              index <= strength
                ? getStrengthColor(strength)
                : "bg-zinc-200 dark:bg-zinc-800"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-right text-xs font-medium ${
          strength === 1
            ? "text-red-500"
            : strength === 2
              ? "text-orange-500"
              : strength === 3
                ? "text-yellow-500"
                : "text-emerald-500"
        }`}
      >
        {getStrengthText(strength)}
      </p>
    </div>
  )
}
