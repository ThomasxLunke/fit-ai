import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDistance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x2 - x1, y2 - y1)
}

export const getAverageDistance = (
  a: { x: number; y: number },
  b: { x: number; y: number }
) => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

export function average(array: number[]) {
  let sum = 0
  if (!array.length) {
    return sum
  }
  for (let i = 0; i < array.length; i++) {
    sum += array[i]
  }
  return sum / array.length
}
