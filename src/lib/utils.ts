import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(timestamp: number) {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)

  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} mins ago`
  if (hours < 24) return `${hours} hrs ago`
  if (days === 1) return `1 day ago`
  if (days < 30) return `${days} days ago`
  if (months === 1) return `1 mo ago`
  return `${months} mos ago`
}
