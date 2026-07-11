import { Brain, Droplets, Route, Target, Turtle, Zap, type LucideIcon } from 'lucide-react'
import type { GameKind, QuestId } from '../lib/types'

export const GAME_ICONS: Record<GameKind, LucideIcon> = {
  reflex: Zap,
  trace: Route,
  memory: Brain,
}

export const QUEST_ICONS: Record<QuestId, LucideIcon> = {
  maxUnits: Target,
  waterDiscipline: Droplets,
  formAbove70: Zap,
  slowPace: Turtle,
}
