import { AnimatePresence, motion } from 'framer-motion'
import { Suspense, lazy, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  Award,
  BookOpen,
  ChevronRight,
  LibraryBig,
  ScrollText,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  ABILITY_MATCH_CHALLENGES,
  ACHIEVEMENTS,
  CLASS_OPTIONS,
  FINAL_EXAM_QUESTIONS,
  FLOW_STEPS,
  GLOSSARY,
  LESSONS,
  QUICK_REFERENCE,
  SPELL_OPTIONS,
} from './courseData'
import {
  calculateLevel,
  createLessonStepState,
  loadProgress,
  playArcaneCue,
  rollDie,
  saveProgress,
  shuffle,
} from './utils'
import LessonMiniGame from './LessonMiniGame'
const WikiModule = lazy(() => import('./WikiModule'))

const particles = Array.from({ length: 14 }, (_, index) => ({
  delay: index * 0.4,
  duration: 7 + (index % 4) * 1.3,
  id: index,
  size: 3 + (index % 3) * 2,
  x: 8 + index * 6.2,
  y: 10 + (index % 5) * 14,
}))

void motion

const sceneTitleMap = {
  abilities: 'РЎРёРіРёР»С‹ С…Р°СЂР°РєС‚РµСЂРёСЃС‚РёРє',
  adventure: 'РљР°СЂС‚Р° РјРёРЅРё-РїСЂРёРєР»СЋС‡РµРЅРёСЏ',
  armor: 'РџРѕРїР°РґР°РЅРёРµ РїРѕ С‰РёС‚Сѓ',
  classes: 'РђСЂС…РµС‚РёРїС‹ РіРµСЂРѕРµРІ',
  combat: 'РЈРґР°СЂ РїРѕ РіРѕР±Р»РёРЅСѓ',
  damage: 'РЈСЂРѕРЅ РїРѕСЃР»Рµ РїРѕРїР°РґР°РЅРёСЏ',
  dice: 'РџРѕР»РєР° РєСѓР±РёРєРѕРІ',
  door: 'РЎРІРѕР±РѕРґР° РІС‹Р±РѕСЂР°',
  exam: 'РџРѕСЃРІСЏС‰РµРЅРёРµ СѓС‡РµРЅРёРєР°',
  flow: 'Р РёС‚Рј СЃРµСЃСЃРёРё',
  modifiers: 'РџР°РЅРµР»СЊ РјРѕРґРёС„РёРєР°С‚РѕСЂР°',
  'skill-check': 'РџСЂРѕРІРµСЂРєР° РЅР° СЃС‚РµРЅРµ',
  spells: 'РўСЂРё Р±Р°Р·РѕРІС‹С… Р·Р°РєР»РёРЅР°РЅРёСЏ',
  table: 'Р’РѕРѕР±СЂР°Р¶РµРЅРёРµ РЅР°Рґ СЃС‚РѕР»РѕРј',
}

const sceneCaptionMap = {
  abilities: 'РЁРµСЃС‚СЊ С…Р°СЂР°РєС‚РµСЂРёСЃС‚РёРє РѕР¶РёРІР°СЋС‚ РєР°Рє СЌРјР±Р»РµРјС‹ Рё РїРѕРґСЃРєР°Р·С‹РІР°СЋС‚ СЃС‚РёР»СЊ РіРµСЂРѕСЏ.',
  adventure: 'Р’ РѕРґРЅРѕРј РјР°Р»РµРЅСЊРєРѕРј РјР°СЂС€СЂСѓС‚Рµ СѓР¶Рµ Р¶РёРІСѓС‚ РІС‹Р±РѕСЂ, РєСѓР±РёРєРё Рё РїРѕСЃР»РµРґСЃС‚РІРёСЏ.',
  armor: 'Р§РёСЃР»Рѕ Р°С‚Р°РєРё СЃС‚Р°Р»РєРёРІР°РµС‚СЃСЏ СЃРѕ С‰РёС‚РѕРј AC Рё СЃСЂР°Р·Сѓ РїРѕРєР°Р·С‹РІР°РµС‚, РїСЂРѕС€С‘Р» Р»Рё СѓРґР°СЂ.',
  classes: 'РљР°Р¶РґС‹Р№ РєР»Р°СЃСЃ РѕС‰СѓС‰Р°РµС‚СЃСЏ РєР°Рє РѕС‚РґРµР»СЊРЅС‹Р№ РїСѓС‚СЊ РіРµСЂРѕСЏ, Р° РЅРµ РїСЂРѕСЃС‚Рѕ РЅР°Р±РѕСЂ С†РёС„СЂ.',
  combat: 'Р‘РѕР№ СЃС‚СЂРѕРёС‚СЃСЏ РёР· РїРѕРЅСЏС‚РЅС‹С… С€Р°РіРѕРІ: РёРЅРёС†РёР°С‚РёРІР°, Р°С‚Р°РєР°, РїРѕРїР°РґР°РЅРёРµ, СѓСЂРѕРЅ.',
  damage: 'РџРѕСЃР»Рµ С‚РѕС‡РЅРѕРіРѕ СѓРґР°СЂР° РёРіСЂР° РѕС‚РґРµР»СЊРЅРѕ РїРѕРєР°Р·С‹РІР°РµС‚ РєСѓР±РёРє СѓСЂРѕРЅР° Рё РїР°РґРµРЅРёРµ HP.',
  dice: 'd20 СЃРёСЏРµС‚ РєР°Рє РіР»Р°РІРЅС‹Р№ РєСѓР±РёРє РїСЂРѕРІРµСЂРѕРє, Р° РѕСЃС‚Р°Р»СЊРЅС‹Рµ РґРѕР±Р°РІР»СЏСЋС‚ РІРєСѓСЃ СѓСЂРѕРЅСѓ Рё СЌС„С„РµРєС‚Р°Рј.',
  door: 'РРіСЂРѕРєРё РјРѕРіСѓС‚ РѕСЃРјРѕС‚СЂРµС‚СЊ РґРІРµСЂСЊ, РїРѕСЃС‚СѓС‡Р°С‚СЊ, РІР·Р»РѕРјР°С‚СЊ РёР»Рё РїСЂРёРґСѓРјР°С‚СЊ СЃРІРѕР№ РІР°СЂРёР°РЅС‚.',
  exam: 'Р¤РёРЅР°Р» РєСѓСЂСЃР° С‡СѓРІСЃС‚РІСѓРµС‚СЃСЏ РєР°Рє РїРѕСЃРІСЏС‰РµРЅРёРµ, Р° РЅРµ РєР°Рє СЃСѓС…РѕР№ С‚РµСЃС‚.',
  flow: 'РЎРµСЃСЃРёСЏ С‚РµС‡С‘С‚ РєР°Рє С†РµРїРѕС‡РєР°: РѕРїРёСЃР°РЅРёРµ, РІС‹Р±РѕСЂ, Р±СЂРѕСЃРѕРє, РїРѕСЃР»РµРґСЃС‚РІРёСЏ.',
  modifiers: 'Р‘РѕРЅСѓСЃС‹ СЂРѕР¶РґР°СЋС‚СЃСЏ РёР· С…Р°СЂР°РєС‚РµСЂРёСЃС‚РёРє Рё РјСЏРіРєРѕ РјРµРЅСЏСЋС‚ С€Р°РЅСЃ СѓСЃРїРµС…Р°.',
  'skill-check': 'РС‚РѕРі СЃРєР»Р°РґС‹РІР°РµС‚СЃСЏ РЅР° РіР»Р°Р·Р°С…: d20, Р±РѕРЅСѓСЃ Рё СЃР»РѕР¶РЅРѕСЃС‚СЊ РІСЃС‚СЂРµС‡Р°СЋС‚СЃСЏ РІ РѕРґРЅРѕР№ С‚РѕС‡РєРµ.',
  spells: 'РњР°РіРёСЏ РјРѕР¶РµС‚ Р¶РµС‡СЊ, РёСЃС†РµР»СЏС‚СЊ РёР»Рё Р·Р°С‰РёС‰Р°С‚СЊ вЂ” Рё СЌС‚Рѕ РІРёРґРЅРѕ Р±РµР· РґР»РёРЅРЅС‹С… С‚Р°Р±Р»РёС†.',
  table: 'РњР°СЃС‚РµСЂ РіРѕРІРѕСЂРёС‚, Р° РЅР°Рґ СЃС‚РѕР»РѕРј РѕР¶РёРІР°СЋС‚ Р»РµСЃ, РґСЂР°РєРѕРЅ, СЃСѓРЅРґСѓРє Рё С‚Р°РІРµСЂРЅР°.',
}

const doorChoices = [
  {
    id: 'inspect',
    label: 'РћСЃРјРѕС‚СЂРµС‚СЊ РґРІРµСЂСЊ',
    result: 'РўС‹ Р·Р°РјРµС‡Р°РµС€СЊ СЃС‚С‘СЂС‚С‹Рµ СЂСѓРЅС‹ Сѓ Р·Р°РјРєР°. РџРѕС…РѕР¶Рµ, Р·РґРµСЃСЊ РјРѕРі Р±С‹С‚СЊ РјР°РіРёС‡РµСЃРєРёР№ РјРµС…Р°РЅРёР·Рј.',
  },
  {
    id: 'knock',
    label: 'РџРѕСЃС‚СѓС‡Р°С‚СЊ',
    result: 'РЎ С‚РѕР№ СЃС‚РѕСЂРѕРЅС‹ СЂР°Р·РґР°С‘С‚СЃСЏ РіР»СѓС…РѕР№ РѕС‚РіРѕР»РѕСЃРѕРє. Р—Р° РґРІРµСЂСЊСЋ С‚РѕС‡РЅРѕ РµСЃС‚СЊ РїСЂРѕСЃС‚СЂР°РЅСЃС‚РІРѕ.',
  },
  {
    id: 'bash',
    label: 'Р’С‹Р±РёС‚СЊ',
    result: 'Р”РІРµСЂСЊ РґСЂРѕР¶РёС‚, РїС‹Р»СЊ СЃС‹РїР»РµС‚СЃСЏ РІРЅРёР·, РЅРѕ С‚РµРїРµСЂСЊ РІСЃРµ РІРѕРєСЂСѓРі Р·РЅР°СЋС‚, С‡С‚Рѕ РІС‹ Р·РґРµСЃСЊ.',
  },
  {
    id: 'trap',
    label: 'РџРѕРёСЃРєР°С‚СЊ Р»РѕРІСѓС€РєСѓ',
    result: 'РЈ РЅРёР¶РЅРµР№ РїРµС‚Р»Рё С‚С‹ Р·Р°РјРµС‡Р°РµС€СЊ РїРѕРґРѕР·СЂРёС‚РµР»СЊРЅСѓСЋ Р»РµСЃРєСѓ. РћС‚Р»РёС‡РЅС‹Р№ РїРѕРІРѕРґ Р±С‹С‚СЊ РѕСЃС‚РѕСЂРѕР¶РЅРµРµ.',
  },
]

const chestActions = [
  {
    id: 'inspect',
    label: 'РћСЃРјРѕС‚СЂРµС‚СЊ',
    bonus: 2,
    dc: 13,
    ability: 'РњСѓРґСЂРѕСЃС‚СЊ',
    success: 'РўС‹ Р·Р°РјРµС‡Р°РµС€СЊ СЃРєСЂС‹С‚СѓСЋ РёРіР»Сѓ Рё Р±РµР·РѕРїР°СЃРЅРѕ РѕС‚РєСЂС‹РІР°РµС€СЊ РјРµС…Р°РЅРёР·Рј. Р’РЅСѓС‚СЂРё Р·РѕР»РѕС‚Рѕ Рё СЃС‚Р°СЂС‹Р№ Р¶РµС‚РѕРЅ.',
    failure: 'РўС‹ РЅРµ Р·Р°РјРµС‡Р°РµС€СЊ РїРѕРґРІРѕС…Р°. РРіР»Р° С‰С‘Р»РєР°РµС‚, РєСЂС‹С€РєР° РѕСЃС‚Р°С‘С‚СЃСЏ Р·Р°РєСЂС‹С‚РѕР№.',
    achievementId: 'chest-opened',
  },
  {
    id: 'pick',
    label: 'Р’СЃРєСЂС‹С‚СЊ РёРЅСЃС‚СЂСѓРјРµРЅС‚Р°РјРё',
    bonus: 4,
    dc: 14,
    ability: 'Р›РѕРІРєРѕСЃС‚СЊ',
    success: 'РћС‚РјС‹С‡РєР° РїРѕРІРѕСЂР°С‡РёРІР°РµС‚СЃСЏ, Р·Р°РјРѕРє СЃРґР°С‘С‚СЃСЏ, Р° РєСЂС‹С€РєР° РїР»Р°РІРЅРѕ РїРѕРґРЅРёРјР°РµС‚СЃСЏ РІРІРµСЂС….',
    failure: 'РРЅСЃС‚СЂСѓРјРµРЅС‚ СЃСЂС‹РІР°РµС‚СЃСЏ. РњРµС…Р°РЅРёР·Рј РїРѕРєР° РЅРµ РїРѕРґРґР°Р»СЃСЏ.',
    achievementId: 'chest-opened',
  },
  {
    id: 'smash',
    label: 'Р Р°Р·Р±РёС‚СЊ',
    bonus: 3,
    dc: 12,
    ability: 'РЎРёР»Р°',
    success: 'Р”РѕСЃРєРё С‚СЂРµСЃРєР°СЋС‚СЃСЏ, СЃСѓРЅРґСѓРє СЂР°СЃРєСЂС‹РІР°РµС‚СЃСЏ, Р° РІРЅСѓС‚СЂРё Р·РІРµРЅСЏС‚ РјРѕРЅРµС‚С‹.',
    failure: 'РЎСѓРЅРґСѓРє РґСЂРѕР¶РёС‚, РЅРѕ СѓСЃС‚РѕСЏР». РЁСѓРј РІС‹С€РµР» РіСЂРѕР·РЅС‹Рј, Р° СЂРµР·СѓР»СЊС‚Р°С‚ РїРѕРєР° СЃРєСЂРѕРјРЅС‹Р№.',
    achievementId: 'chest-opened',
  },
  {
    id: 'leave',
    label: 'РћСЃС‚Р°РІРёС‚СЊ',
    bonus: 0,
    dc: 0,
    ability: 'РћСЃС‚РѕСЂРѕР¶РЅРѕСЃС‚СЊ',
    success: 'РРЅРѕРіРґР° Р»СѓС‡С€РёР№ С…РѕРґ вЂ” РїСЂРѕР№С‚Рё РјРёРјРѕ Рё СЃРѕС…СЂР°РЅРёС‚СЊ СЃРёР»С‹ РґР»СЏ РґСЂСѓРіРѕР№ СЃС†РµРЅС‹.',
    failure: '',
  },
]

const guardActions = [
  {
    id: 'persuade',
    label: 'РЈР±РµРґРёС‚СЊ',
    bonus: 3,
    dc: 13,
    ability: 'РҐР°СЂРёР·РјР°',
    success: 'РЎС‚СЂР°Р¶РЅРёРє СЂР°СЃСЃР»Р°Р±Р»СЏРµС‚СЃСЏ Рё РїСЂРѕРїСѓСЃРєР°РµС‚ РІР°СЃ Рє РІРѕСЂРѕС‚Р°Рј.',
    failure: 'РћРЅ РєР°С‡Р°РµС‚ РіРѕР»РѕРІРѕР№ Рё РїСЂРѕСЃРёС‚ РіРѕРІРѕСЂРёС‚СЊ РїРѕ СЃСѓС‰РµСЃС‚РІСѓ.',
    achievementId: 'silver-tongue',
  },
  {
    id: 'deceive',
    label: 'РћР±РјР°РЅСѓС‚СЊ',
    bonus: 4,
    dc: 14,
    ability: 'РћР±РјР°РЅ',
    success: 'Р›РѕР¶СЊ Р·РІСѓС‡РёС‚ РґРѕСЃС‚Р°С‚РѕС‡РЅРѕ СѓРІРµСЂРµРЅРЅРѕ, Рё СЃС‚СЂР°Р¶РЅРёРє РґРµР»Р°РµС‚ С€Р°Рі РІ СЃС‚РѕСЂРѕРЅСѓ.',
    failure: 'РЎС‚СЂР°Р¶РЅРёРє РїСЂРёС‰СѓСЂРёРІР°РµС‚СЃСЏ. РСЃС‚РѕСЂРёСЏ Р·РІСѓС‡РёС‚ РїРѕРґРѕР·СЂРёС‚РµР»СЊРЅРѕ.',
    achievementId: 'silver-tongue',
  },
  {
    id: 'intimidate',
    label: 'Р—Р°РїСѓРіР°С‚СЊ',
    bonus: 2,
    dc: 15,
    ability: 'Р—Р°РїСѓРіРёРІР°РЅРёРµ',
    success: 'РЎС‚СЂР°Р¶РЅРёРє РЅРµ С…РѕС‡РµС‚ РїСЂРѕР±Р»РµРј Рё СѓСЃС‚СѓРїР°РµС‚ РїСЂРѕС…РѕРґ.',
    failure: 'РћРЅ РєР»Р°РґС‘С‚ СЂСѓРєСѓ РЅР° РєРѕРїСЊС‘ Рё СЏРІРЅРѕ Р¶РґС‘С‚ РїСЂРѕРґРѕР»Р¶РµРЅРёСЏ.',
    achievementId: 'silver-tongue',
  },
  {
    id: 'leave',
    label: 'РЈР№С‚Рё',
    bonus: 0,
    dc: 0,
    ability: 'РўР°РєС‚РёРєР°',
    success: 'РРЅРѕРіРґР° С‚Р°РєС‚РёС‡РµСЃРєРѕРµ РѕС‚СЃС‚СѓРїР»РµРЅРёРµ С‚РѕР¶Рµ СЂР°Р·СѓРјРЅРѕРµ СЂРµС€РµРЅРёРµ.',
    failure: '',
  },
]

const armorDc = 13

function App() {
  const [progress, setProgress] = useState(() => loadProgress(LESSONS))
  const [compendiumOpen, setCompendiumOpen] = useState(false)
  const [compendiumMode, setCompendiumMode] = useState('glossary')
  const [achievementQueue, setAchievementQueue] = useState([])

  const academyRef = useRef(null)
  const trialsRef = useRef(null)

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const completedSet = useMemo(
    () => new Set(progress.completedLessonIds),
    [progress.completedLessonIds],
  )

  const unlockedCount = Math.min(LESSONS.length, progress.completedLessonIds.length + 1)
  const selectedLesson =
    LESSONS.find((lesson) => lesson.id === progress.selectedLessonId) ?? LESSONS[0]
  const currentLesson =
    LESSONS.find((lesson) => lesson.id === progress.currentLessonId) ?? LESSONS[0]
  const nextLesson =
    LESSONS.find((lesson) => !completedSet.has(lesson.id)) ?? LESSONS[LESSONS.length - 1]
  const progressPercent = Math.round((progress.completedLessonIds.length / LESSONS.length) * 100)
  const level = calculateLevel(progress.xp)
  const selectedLessonState =
    progress.lessonStepStates?.[selectedLesson.id] ?? createLessonStepState(completedSet.has(selectedLesson.id))
  const recentAchievements = ACHIEVEMENTS.filter((item) =>
    progress.achievements.includes(item.id),
  ).slice(-4)

  const queueAchievements = (ids) => {
    const badges = ACHIEVEMENTS.filter((item) => ids.includes(item.id))
    if (!badges.length) {
      return
    }
    setAchievementQueue((queue) => [...queue, ...badges])
    playArcaneCue(progress.soundEnabled, 'achievement')
  }

  const scrollTo = (ref) => {
    window.requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const enterAcademy = ({ preview = false } = {}) => {
    setProgress((previous) => ({
      ...previous,
      view: 'academy',
      selectedLessonId: previous.currentLessonId ?? LESSONS[0].id,
      introSeen: preview ? true : previous.introSeen,
    }))
    scrollTo(academyRef)
  }

  const enterWiki = () => {
    setProgress((previous) => ({ ...previous, view: 'wiki' }))
  }

  const selectLesson = (lessonId) => {
    const index = LESSONS.findIndex((lesson) => lesson.id === lessonId)
    if (index >= unlockedCount && !completedSet.has(lessonId)) {
      return
    }
    setProgress((previous) => ({ ...previous, view: 'academy', selectedLessonId: lessonId }))
  }

  const markLessonSteps = (lessonId, steps) => {
    if (!steps.length) {
      return
    }

    setProgress((previous) => {
      const currentState =
        previous.lessonStepStates?.[lessonId] ??
        createLessonStepState(previous.completedLessonIds.includes(lessonId))
      const nextState = { ...currentState }
      let changed = false

      steps.forEach((step) => {
        if (!nextState[step]) {
          nextState[step] = true
          changed = true
        }
      })

      if (!changed) {
        return previous
      }

      return {
        ...previous,
        lessonStepStates: {
          ...previous.lessonStepStates,
          [lessonId]: nextState,
        },
      }
    })
  }

  const completePracticeStep = (lessonId) => {
    markLessonSteps(lessonId, ['practice'])
  }

  const completeMiniGameStep = (lessonId, { achievementId = null, xpReward = 0 } = {}) => {
    let earned = []
    let completedNow = false

    setProgress((previous) => {
      const currentState =
        previous.lessonStepStates?.[lessonId] ??
        createLessonStepState(previous.completedLessonIds.includes(lessonId))

      if (currentState.miniGame) {
        return previous
      }

      earned =
        achievementId && !previous.achievements.includes(achievementId) ? [achievementId] : []
      completedNow = true

      return {
        ...previous,
        achievements: [...previous.achievements, ...earned],
        lessonStepStates: {
          ...previous.lessonStepStates,
          [lessonId]: {
            ...currentState,
            miniGame: true,
          },
        },
        xp: previous.xp + xpReward,
      }
    })

    if (earned.length) {
      queueAchievements(earned)
    }

    if (completedNow) {
      playArcaneCue(progress.soundEnabled, 'achievement')
    }
  }

  const completeLesson = (lessonId) => {
    let earned = []
    let celebrationCue = 'success'

    setProgress((previous) => {
      if (previous.completedLessonIds.includes(lessonId)) {
        const lessonIndex = LESSONS.findIndex((lesson) => lesson.id === lessonId)
        const nextByOrder = LESSONS[lessonIndex + 1] ?? LESSONS[lessonIndex]
        return { ...previous, selectedLessonId: nextByOrder.id }
      }

      const lesson = LESSONS.find((item) => item.id === lessonId)
      const lessonState =
        previous.lessonStepStates?.[lessonId] ??
        createLessonStepState(previous.completedLessonIds.includes(lessonId))
      const readyToComplete = ['theory', 'example', 'practice', 'miniGame'].every(
        (step) => lessonState[step],
      )

      if (!readyToComplete) {
        return previous
      }

      const completedLessonIds = [...previous.completedLessonIds, lessonId]
      const candidateAchievements = ['first-lesson']

      if (lessonId === 'dice') {
        candidateAchievements.push('first-roll')
      }
      if (lessonId === 'classes') {
        candidateAchievements.push('class-scholar')
      }
      if (lessonId === 'game-flow') {
        candidateAchievements.push('dm-apprentice')
      }
      if (completedLessonIds.length === LESSONS.length) {
        candidateAchievements.push('graduate')
        celebrationCue = 'achievement'
      }

      earned = candidateAchievements.filter((id) => !previous.achievements.includes(id))
      const nextCurrent =
        LESSONS.find((item) => !completedLessonIds.includes(item.id)) ?? lesson

      return {
        ...previous,
        achievements: [...previous.achievements, ...earned],
        completedLessonIds,
        currentLessonId: nextCurrent.id,
        selectedLessonId: nextCurrent.id,
        xp: previous.xp + lesson.xp,
      }
    })

    if (earned.length) {
      queueAchievements(earned)
    } else {
      playArcaneCue(progress.soundEnabled, celebrationCue)
    }
  }

  const registerTrial = ({ trialId, xpReward = 40, success = false, achievementId }) => {
    let earned = []
    let firstCompletion = false

    setProgress((previous) => {
      firstCompletion = trialId ? !previous.trialsCompleted[trialId] : false
      earned =
        achievementId && !previous.achievements.includes(achievementId)
          ? [achievementId]
          : []

      return {
        ...previous,
        achievements: [...previous.achievements, ...earned],
        trialsCompleted: trialId
          ? { ...previous.trialsCompleted, [trialId]: true }
          : previous.trialsCompleted,
        xp: previous.xp + (firstCompletion ? xpReward : 0),
      }
    })

    if (earned.length) {
      queueAchievements(earned)
    }

    playArcaneCue(progress.soundEnabled, success ? 'success' : 'roll')
  }

  return (
    <div className="app-shell">
      <div className="background-veil" />
      <div className="background-glow background-glow-left" />
      <div className="background-glow background-glow-right" />
      {particles.map((particle) => (
        <motion.span
          animate={{ opacity: [0.08, 0.32, 0.08], scale: [1, 1.18, 1], y: [0, -24, 0] }}
          className="ambient-particle"
          key={particle.id}
          style={{
            height: particle.size,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
          }}
          transition={{
            delay: particle.delay,
            duration: particle.duration,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />
      ))}

      <main className="page-shell">
        <Navbar
          level={level}
          newbieMode={progress.newbieMode}
          onContinue={() => {
            setProgress((previous) => ({
              ...previous,
              view: 'academy',
              selectedLessonId: nextLesson.id,
            }))
            scrollTo(academyRef)
          }}
          onGoHome={() => setProgress((previous) => ({ ...previous, view: 'hero' }))}
          onOpenGlossary={() => {
            setCompendiumMode('glossary')
            setCompendiumOpen(true)
          }}
          onOpenReference={() => {
            setCompendiumMode('reference')
            setCompendiumOpen(true)
          }}
          onOpenWiki={enterWiki}
          onToggleNewbie={() =>
            setProgress((previous) => ({ ...previous, newbieMode: !previous.newbieMode }))
          }
          onToggleSound={() =>
            setProgress((previous) => ({ ...previous, soundEnabled: !previous.soundEnabled }))
          }
          progressPercent={progressPercent}
          soundEnabled={progress.soundEnabled}
          streak={progress.streak}
          view={progress.view}
        />

        {progress.view === 'hero' && (
          <HeroSection
            achievementsCount={progress.achievements.length}
            lessonsCount={LESSONS.length}
            onHowItWorks={() => enterAcademy({ preview: true })}
            onOpenWiki={enterWiki}
            onStart={() => enterAcademy()}
            progressPercent={progressPercent}
          />
        )}

        {progress.view === 'academy' && (
          <div className="academy-stack" ref={academyRef}>
            <section className="academy-grid">
              <ProgressPanel
                currentLesson={currentLesson}
                lessonsCompleted={progress.completedLessonIds.length}
                level={level}
                progressPercent={progressPercent}
                recentAchievements={recentAchievements}
                streak={progress.streak}
                totalLessons={LESSONS.length}
                xp={progress.xp}
              />

              <LearningMap
                completedSet={completedSet}
                currentLessonId={progress.currentLessonId}
                lessons={LESSONS}
                onSelectLesson={selectLesson}
                selectedLessonId={selectedLesson.id}
                unlockedCount={unlockedCount}
              />
            </section>

            <LessonStage
              key={selectedLesson.id}
              completedSet={completedSet}
              lesson={selectedLesson}
              lessonState={selectedLessonState}
              onCompleteMiniGame={completeMiniGameStep}
              newbieMode={progress.newbieMode}
              onCompleteLesson={completeLesson}
              onMarkLessonSteps={markLessonSteps}
              onPracticeComplete={completePracticeStep}
              onJumpToTrials={() => scrollTo(trialsRef)}
              soundEnabled={progress.soundEnabled}
            />

            <section className="panel trial-section" ref={trialsRef}>
              <div className="section-heading">
                <div>
                  <span className="section-kicker">РџРѕР»РµРІС‹Рµ С‚СЂРµРЅРёСЂРѕРІРєРё</span>
                  <h2 className="section-title">РњРёРЅРё-РёРіСЂС‹ Рё Р¶РёРІР°СЏ РїСЂР°РєС‚РёРєР°</h2>
                  <p className="section-subtitle">
                    Р—РґРµСЃСЊ С‚РµРѕСЂРёСЏ РїСЂРµРІСЂР°С‰Р°РµС‚СЃСЏ РІ РѕРїС‹С‚: СЃСѓРЅРґСѓРє, РїРµСЂРµРіРѕРІРѕСЂС‹ Рё РїРµСЂРІС‹Р№ Р±РѕР№.
                  </p>
                </div>
              </div>

              <div className="trial-grid">
                <MiniGameCard
                  actions={chestActions}
                  description="РџРµСЂРµРґ С‚РѕР±РѕР№ РґСЂРµРІРЅРёР№ Р·Р°РїРµСЂС‚С‹Р№ СЃСѓРЅРґСѓРє. Р РµС€Рё, РєР°Рє РіРµСЂРѕР№ РїРѕРїСЂРѕР±СѓРµС‚ СЃРїСЂР°РІРёС‚СЊСЃСЏ СЃ РЅРёРј."
                  onOutcome={(payload) => registerTrial({ ...payload, trialId: 'chest' })}
                  soundEnabled={progress.soundEnabled}
                  title="РЎС‚Р°СЂС‹Р№ СЃСѓРЅРґСѓРє"
                />
                <MiniGameCard
                  actions={guardActions}
                  description="РџРµСЂРµРґ РІРѕСЂРѕС‚Р°РјРё СЃС‚РѕРёС‚ РЅР°СЃС‚РѕСЂРѕР¶РµРЅРЅС‹Р№ СЃС‚СЂР°Р¶РЅРёРє. РљР°РєРёРј С‚РѕРЅРѕРј РіРµСЂРѕР№ РїРѕРїСЂРѕР±СѓРµС‚ РїСЂРѕР»РѕР¶РёС‚СЊ РїСѓС‚СЊ?"
                  onOutcome={(payload) => registerTrial({ ...payload, trialId: 'guard' })}
                  soundEnabled={progress.soundEnabled}
                  title="РЎС‚СЂР°Р¶РЅРёРє Сѓ РІРѕСЂРѕС‚"
                />
                <CombatDemo
                  onVictory={() =>
                    registerTrial({
                      achievementId: 'first-victory',
                      success: true,
                      trialId: 'combat',
                      xpReward: 55,
                    })
                  }
                  soundEnabled={progress.soundEnabled}
                  title="РџРµСЂРІС‹Р№ Р±РѕР№"
                />
              </div>
            </section>
          </div>
        )}

        {progress.view === 'wiki' && (
          <Suspense
            fallback={<div className="panel wiki-fallback">Загружаю модуль энциклопедии…</div>}
          >
            <WikiModule onOpenAcademy={() => enterAcademy({ preview: true })} />
          </Suspense>
        )}

        <GlossaryDrawer
          glossary={GLOSSARY}
          mode={compendiumMode}
          onClose={() => setCompendiumOpen(false)}
          open={compendiumOpen}
          quickReference={QUICK_REFERENCE}
        />

        <AchievementPopup
          achievement={achievementQueue[0]}
          onClose={() => setAchievementQueue((queue) => queue.slice(1))}
        />

        {progress.view === 'academy' && !progress.introSeen && (
          <OnboardingModal
            onEnter={() => setProgress((previous) => ({ ...previous, introSeen: true }))}
          />
        )}

        <Footer />
      </main>
    </div>
  )
}

function Navbar({
  level,
  newbieMode,
  onContinue,
  onGoHome,
  onOpenGlossary,
  onOpenReference,
  onOpenWiki,
  onToggleNewbie,
  onToggleSound,
  progressPercent,
  soundEnabled,
  streak,
  view,
}) {
  return (
    <header className="topbar">
      <button className="brand-button" onClick={onGoHome} type="button">
        <span className="brand-mark">DnD</span>
        <span className="brand-copy">
          <strong>D&amp;D Academy</strong>
          <small>РЁРєРѕР»Р° РїСЂРёРєР»СЋС‡РµРЅС†Р°</small>
        </span>
      </button>

      <div className="topbar-status">
        <span className="status-pill">Lv. {level}</span>
        <span className="status-pill">{progressPercent}% РєСѓСЂСЃР°</span>
        <span className="status-pill">{streak} day streak</span>
      </div>

      <div className="topbar-actions">
        <button className="icon-button" onClick={onContinue} type="button">
          <ChevronRight size={16} />
          <span>
            {view === 'hero'
              ? 'РџСЂРѕРґРѕР»Р¶РёС‚СЊ РєСѓСЂСЃ'
              : view === 'wiki'
                ? 'Р’ Р°РєР°РґРµРјРёСЋ'
                : 'Рљ С‚РµРєСѓС‰РµРјСѓ СѓСЂРѕРєСѓ'}
          </span>
        </button>

        <button className="icon-button" onClick={onOpenReference} type="button">
          <ScrollText size={16} />
          <span>РЎРїСЂР°РІРѕС‡РЅРёРє</span>
        </button>

        <button className="icon-button" onClick={onOpenWiki} type="button">
          <LibraryBig size={16} />
          <span>D&amp;D Википедия</span>
        </button>

        <button className="icon-button" onClick={onOpenGlossary} type="button">
          <BookOpen size={16} />
          <span>РЎР»РѕРІР°СЂСЊ</span>
        </button>

        <button
          className={`toggle-pill ${newbieMode ? 'is-active' : ''}`}
          onClick={onToggleNewbie}
          type="button"
        >
          <Award size={16} />
          <span>РЇ СЃРѕРІСЃРµРј РЅРѕРІРёС‡РѕРє</span>
        </button>

        <button className="toggle-pill" onClick={onToggleSound} type="button">
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{soundEnabled ? 'Р—РІСѓРє РІРєР»СЋС‡С‘РЅ' : 'Р—РІСѓРє РІС‹РєР»СЋС‡РµРЅ'}</span>
        </button>
      </div>
    </header>
  )
}

function HeroSection({
  achievementsCount,
  lessonsCount,
  onHowItWorks,
  onOpenWiki,
  onStart,
  progressPercent,
}) {
  const [pointer, setPointer] = useState({ x: 0, y: 0 })

  const handleMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - bounds.left - bounds.width / 2) / bounds.width
    const y = (event.clientY - bounds.top - bounds.height / 2) / bounds.height
    setPointer({ x, y })
  }

  return (
    <section className="hero-grid" onMouseLeave={() => setPointer({ x: 0, y: 0 })} onMouseMove={handleMove}>
      <div className="hero-copy">
        <motion.span animate={{ opacity: 1, y: 0 }} className="eyebrow" initial={{ opacity: 0, y: 16 }}>
          РђРєР°РґРµРјРёСЏ РїСЂРёРєР»СЋС‡РµРЅС†РµРІ РґР»СЏ РЅРѕРІРёС‡РєРѕРІ
        </motion.span>
        <motion.h1 animate={{ opacity: 1, y: 0 }} className="hero-title" initial={{ opacity: 0, y: 22 }}>
          РР·СѓС‡Рё Dungeons &amp; Dragons СЃ РЅСѓР»СЏ
        </motion.h1>
        <motion.p animate={{ opacity: 1, y: 0 }} className="hero-subtitle" initial={{ opacity: 0, y: 18 }}>
          РџРѕР№РјРё РєСѓР±РёРєРё, РїСЂРѕРІРµСЂРєРё, Р±РѕР№, РєР»Р°СЃСЃС‹ Рё СЃР°РјСѓ СЃСѓС‚СЊ РёРіСЂС‹ вЂ” Р»РµРіРєРѕ, РєСЂР°СЃРёРІРѕ Рё С€Р°Рі Р·Р° С€Р°РіРѕРј.
        </motion.p>
        <motion.div animate={{ opacity: 1, y: 0 }} className="hero-actions" initial={{ opacity: 0, y: 18 }}>
          <button className="btn-primary" onClick={onStart} type="button">
            РќР°С‡Р°С‚СЊ РїСЂРёРєР»СЋС‡РµРЅРёРµ
          </button>
          <button className="btn-secondary" onClick={onHowItWorks} type="button">
            РџРѕСЃРјРѕС‚СЂРµС‚СЊ РєР°Рє СЌС‚Рѕ СЂР°Р±РѕС‚Р°РµС‚
          </button>
          <button className="btn-secondary" onClick={onOpenWiki} type="button">
            D&amp;D Википедия
          </button>
        </motion.div>

        <div className="hero-meta-grid">
          <div className="hero-meta-card">
            <strong>{lessonsCount}</strong>
            <span>СѓСЂРѕРєРѕРІ РІ РїСѓС‚Рё РЅРѕРІРёС‡РєР°</span>
          </div>
          <div className="hero-meta-card">
            <strong>3</strong>
            <span>РјРёРЅРё-РёРіСЂС‹ СЃ Р¶РёРІС‹РјРё Р±СЂРѕСЃРєР°РјРё</span>
          </div>
          <div className="hero-meta-card">
            <strong>{Math.max(progressPercent, achievementsCount)}</strong>
            <span>РїСЂРѕРіСЂРµСЃСЃ Рё РЅР°РіСЂР°РґС‹ СѓР¶Рµ СЃРѕС…СЂР°РЅСЏСЋС‚СЃСЏ</span>
          </div>
        </div>
      </div>

      <div className="hero-visual-wrap">
        <div
          className="hero-visual-stage"
          style={{ transform: `translate3d(${pointer.x * -18}px, ${pointer.y * -14}px, 0)` }}
        >
          <div className="hero-light hero-light-left" />
          <div className="hero-light hero-light-right" />
          <div className="hero-runic-ring" />

          <div className="hero-table">
            <div className="hero-map" />
            <motion.div animate={{ rotate: [0, 180, 360], y: [0, -10, 0] }} className="hero-die" transition={{ duration: 9, ease: 'linear', repeat: Infinity }}>
              d20
            </motion.div>
            <motion.div animate={{ rotate: [-2, 2, -2], y: [0, -6, 0] }} className="hero-book" transition={{ duration: 5.2, ease: 'easeInOut', repeat: Infinity }} />
            <div className="hero-candle hero-candle-left">
              <span className="hero-flame" />
            </div>
            <div className="hero-candle hero-candle-right">
              <span className="hero-flame" />
            </div>
            <motion.div animate={{ y: [0, -8, 0] }} className="hero-card hero-card-1" transition={{ duration: 4.6, ease: 'easeInOut', repeat: Infinity }}>
              Р‘РѕР№
            </motion.div>
            <motion.div animate={{ y: [0, -10, 0] }} className="hero-card hero-card-2" transition={{ duration: 5.2, ease: 'easeInOut', repeat: Infinity }}>
              d20
            </motion.div>
            <motion.div animate={{ y: [0, -7, 0] }} className="hero-card hero-card-3" transition={{ duration: 4.2, ease: 'easeInOut', repeat: Infinity }}>
              РљР»Р°СЃСЃС‹
            </motion.div>
          </div>

          <div className="hero-note">
            <strong>Р–РёРІР°СЏ Р°РєР°РґРµРјРёСЏ</strong>
            <span>РЈСЂРѕРєРё РѕС‚РєСЂС‹РІР°СЋС‚СЃСЏ РїРѕ РїСѓС‚Рё, РґР°СЋС‚ XP Рё РїРѕРґРєСЂРµРїР»СЏСЋС‚СЃСЏ РёРЅС‚РµСЂР°РєС‚РёРІРЅС‹РјРё СЃС†РµРЅР°РјРё.</span>
          </div>
        </div>
      </div>
    </section>
  )
}

function ProgressPanel({
  currentLesson,
  lessonsCompleted,
  level,
  progressPercent,
  recentAchievements,
  streak,
  totalLessons,
  xp,
}) {
  const xpIntoLevel = xp % 180
  const xpToNext = 180 - xpIntoLevel

  return (
    <section className="panel progress-panel">
      <div className="section-heading">
        <div>
          <span className="section-kicker">РџСЂРѕРіСЂРµСЃСЃ СѓС‡РµРЅРёРєР°</span>
          <h2 className="section-title">РџР°РЅРµР»СЊ Р°РєР°РґРµРјРёРё</h2>
          <p className="section-subtitle">РњСЏРіРєР°СЏ РіРµР№РјРёС„РёРєР°С†РёСЏ РІ РґСѓС…Рµ Duolingo, РЅРѕ РІ Р°С‚РјРѕСЃС„РµСЂРµ С„СЌРЅС‚РµР·Рё-С€РєРѕР»С‹.</p>
        </div>
      </div>

      <div className="xp-shell">
        <div className="xp-labels">
          <span>XP РІ СѓСЂРѕРІРЅРµ: {xpIntoLevel} / 180</span>
          <strong>{progressPercent}%</strong>
        </div>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <small>Р”Рѕ СЃР»РµРґСѓСЋС‰РµРіРѕ СѓСЂРѕРІРЅСЏ РѕСЃС‚Р°Р»РѕСЃСЊ {xpToNext} XP</small>
      </div>

      <div className="progress-stat-grid">
        <article className="progress-stat">
          <span>РЈСЂРѕРІРµРЅСЊ</span>
          <strong className="progress-number">{level}</strong>
        </article>
        <article className="progress-stat">
          <span>РџСЂРѕР№РґРµРЅРѕ</span>
          <strong className="progress-number">
            {lessonsCompleted}/{totalLessons}
          </strong>
        </article>
        <article className="progress-stat">
          <span>Streak</span>
          <strong className="progress-number">{streak}</strong>
        </article>
      </div>

      <div className="progress-current">
        <span>РџСЂРѕРґРѕР»Р¶РёС‚СЊ СЃ С‚РµРјС‹</span>
        <strong>{currentLesson.chapter}</strong>
        <p>{currentLesson.title}</p>
      </div>

      <div className="achievement-strip">
        {recentAchievements.length ? (
          recentAchievements.map((achievement) => (
            <div className="achievement-pill" key={achievement.id}>
              <span>{achievement.glyph}</span>
              <div>
                <strong>{achievement.title}</strong>
                <small>{achievement.description}</small>
              </div>
            </div>
          ))
        ) : (
          <div className="achievement-pill">
            <span>XP</span>
            <div>
              <strong>РџРµСЂРІС‹Рµ РґРѕСЃС‚РёР¶РµРЅРёСЏ Р¶РґСѓС‚</strong>
              <small>Р—Р°РІРµСЂС€Рё СѓСЂРѕРє РёР»Рё РјРёРЅРё-РёРіСЂСѓ, С‡С‚РѕР±С‹ РѕС‚РєСЂС‹С‚СЊ РїРµСЂРІС‹Р№ badge.</small>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function LearningMap({
  completedSet,
  currentLessonId,
  lessons,
  onSelectLesson,
  selectedLessonId,
  unlockedCount,
}) {
  return (
    <section className="panel learning-map-panel">
      <div className="section-heading">
        <div>
          <span className="section-kicker">РџСѓС‚СЊ РѕР±СѓС‡РµРЅРёСЏ</span>
          <h2 className="section-title">РљР°СЂС‚Р° Р°РєР°РґРµРјРёРё</h2>
          <p className="section-subtitle">РЈСЂРѕРєРё РѕС‚РєСЂС‹РІР°СЋС‚СЃСЏ РїРѕСЃР»РµРґРѕРІР°С‚РµР»СЊРЅРѕ, РєР°Рє РЅР° РєР°СЂС‚Рµ РїСЂРёРєР»СЋС‡РµРЅРёСЏ.</p>
        </div>
      </div>

      <div className="map-track">
        {lessons.map((lesson, index) => {
          const completed = completedSet.has(lesson.id)
          const current = lesson.id === currentLessonId
          const selected = lesson.id === selectedLessonId
          const locked = index >= unlockedCount && !completed

          return (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className={`map-node-row ${index % 2 === 0 ? 'left' : 'right'}`}
              initial={{ opacity: 0, x: index % 2 === 0 ? -18 : 18 }}
              key={lesson.id}
              transition={{ delay: index * 0.03, duration: 0.4 }}
            >
              <div className={`map-connector ${index < unlockedCount ? 'is-open' : ''}`} />
              <button
                className={[
                  'lesson-card',
                  completed ? 'is-complete' : '',
                  current ? 'is-current' : '',
                  locked ? 'is-locked' : '',
                  selected ? 'is-selected' : '',
                ].filter(Boolean).join(' ')}
                disabled={locked}
                onClick={() => onSelectLesson(lesson.id)}
                type="button"
              >
                <span className="lesson-glyph">{lesson.glyph}</span>
                <div className="lesson-card-meta">
                  <strong>{lesson.title}</strong>
                  <small>{lesson.duration}</small>
                </div>
                <span className="lesson-card-state">
                  {completed ? 'РћСЃРІРѕРµРЅ' : current ? 'РўРµРєСѓС‰РёР№ СѓСЂРѕРє' : locked ? 'Р—Р°РєСЂС‹С‚' : 'РћС‚РєСЂС‹С‚'}
                </span>
              </button>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

function LessonChecklist({ lessonState }) {
  const items = [
    { id: 'theory', title: 'РўРµРѕСЂРёСЏ', note: 'РљРѕСЂРѕС‚РєРѕРµ РѕР±СЉСЏСЃРЅРµРЅРёРµ С‚РµРјС‹' },
    { id: 'example', title: 'РџСЂРёРјРµСЂ', note: 'Р–РёРІР°СЏ Р°РЅРёРјР°С†РёРѕРЅРЅР°СЏ СЃС†РµРЅР°' },
    { id: 'practice', title: 'РџСЂР°РєС‚РёРєР°', note: 'РРЅС‚РµСЂР°РєС‚РёРІ Рё РјРёРЅРё-РїСЂРѕРІРµСЂРєР°' },
    { id: 'miniGame', title: 'РњРёРЅРё-РёРіСЂР°', note: 'РћС‚РґРµР»СЊРЅРѕРµ С‚РµРјР°С‚РёС‡РµСЃРєРѕРµ РёСЃРїС‹С‚Р°РЅРёРµ' },
  ]

  return (
    <div className="lesson-checklist">
      {items.map((item) => (
        <article
          className={`lesson-checkpoint ${lessonState[item.id] ? 'is-complete' : ''}`}
          key={item.id}
        >
          <span className="lesson-check-icon">{lessonState[item.id] ? 'OK' : '...'}</span>
          <div>
            <strong>{item.title}</strong>
            <small>{item.note}</small>
          </div>
        </article>
      ))}
    </div>
  )
}

function LessonStage({
  completedSet,
  lesson,
  lessonState,
  onCompleteMiniGame,
  newbieMode,
  onCompleteLesson,
  onMarkLessonSteps,
  onPracticeComplete,
  onJumpToTrials,
  soundEnabled,
}) {
  const isCompleted = completedSet.has(lesson.id)
  const practiceType = lesson.practice?.type ?? 'quiz'
  const lessonQuiz = lesson.miniQuiz ?? { question: '', options: [] }
  const requiresInteractivePractice = !['quiz', 'adventure'].includes(practiceType)
  const [selectedOptionId, setSelectedOptionId] = useState(null)
  const [quizPassed, setQuizPassed] = useState(() => isCompleted || lessonState.practice)
  const [practiceActionComplete, setPracticeActionComplete] = useState(
    () => isCompleted || lessonState.practice || !requiresInteractivePractice,
  )
  const [doorChoice, setDoorChoice] = useState(null)
  const [abilityIndex, setAbilityIndex] = useState(0)
  const [abilityFeedback, setAbilityFeedback] = useState('')
  const [modifierScore, setModifierScore] = useState(14)
  const [armorResult, setArmorResult] = useState(null)
  const [damageState, setDamageState] = useState({ attack: null, damage: null, hit: false })
  const [selectedSpellId, setSelectedSpellId] = useState(SPELL_OPTIONS[0].id)
  const [flowAvailable, setFlowAvailable] = useState(shuffle(FLOW_STEPS))
  const [flowBuilt, setFlowBuilt] = useState([])
  const [flowFeedback, setFlowFeedback] = useState('')

  const selectedQuizOption = lessonQuiz.options.find((option) => option.id === selectedOptionId)
  const modifierValue = Math.floor((modifierScore - 10) / 2)
  const selectedSpell = SPELL_OPTIONS.find((spell) => spell.id === selectedSpellId) ?? SPELL_OPTIONS[0]
  const practiceReady = lessonState.practice || (practiceActionComplete && quizPassed)
  const canFinish =
    isCompleted ||
    ['theory', 'example', 'practice', 'miniGame'].every((step) => lessonState[step])

  useEffect(() => {
    onMarkLessonSteps(lesson.id, ['theory', 'example'])
  }, [lesson.id, onMarkLessonSteps])

  useEffect(() => {
    if (!lessonState.practice && practiceActionComplete && quizPassed) {
      onPracticeComplete(lesson.id)
    }
  }, [lesson.id, lessonState.practice, onPracticeComplete, practiceActionComplete, quizPassed])

  const markPracticeInteraction = () => {
    setPracticeActionComplete(true)
  }

  const answerQuiz = (optionId) => {
    setSelectedOptionId(optionId)
    const option = lessonQuiz.options.find((item) => item.id === optionId)
    if (option?.correct) {
      setQuizPassed(true)
    }
    playArcaneCue(soundEnabled, option?.correct ? 'success' : 'fail')
  }

  return (
    <section className="panel lesson-stage">
      <div className="lesson-topline">
        <span className="section-kicker">{lesson.chapter}</span>
        <span className="result-pill">+{lesson.xp} XP</span>
      </div>

      <LessonChecklist lessonState={lessonState} />

      <div className="lesson-grid">
        <div className="lesson-copy">
          <div className="lesson-heading lesson-section">
            <span className="section-kicker">РўРµРѕСЂРёСЏ</span>
            <h2 className="lesson-title">{lesson.title}</h2>
            <p className="lesson-summary">{lesson.summary}</p>
          </div>

          {newbieMode && <div className="lesson-newbie-note">{lesson.newbieSummary}</div>}

          <div className="lesson-paragraphs">
            {lesson.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <ul className="lesson-bullet-list">
            {lesson.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>

          <div className="term-row">
            {lesson.terms.map((term) => (
              <span className="term-chip" key={term}>
                {term}
              </span>
            ))}
          </div>

          <div className="lesson-actions">
            <button
              className="btn-secondary"
              onClick={() => {
                setPracticeActionComplete(!requiresInteractivePractice)
                setQuizPassed(false)
                setSelectedOptionId(null)
              }}
              type="button"
            >
              РџРѕРїСЂРѕР±РѕРІР°С‚СЊ СЃР°РјРѕРјСѓ
            </button>
            <button
              className="btn-primary"
              disabled={!canFinish}
              onClick={() => onCompleteLesson(lesson.id)}
              type="button"
            >
              {isCompleted
                ? 'РџРѕРІС‚РѕСЂРёС‚СЊ Рё РїРµСЂРµР№С‚Рё РґР°Р»СЊС€Рµ'
                : canFinish
                  ? 'РЈСЂРѕРє РѕСЃРІРѕРµРЅ'
                  : 'Р—Р°РєСЂРѕР№ С‚РµРѕСЂРёСЋ, РїСЂР°РєС‚РёРєСѓ Рё РјРёРЅРё-РёРіСЂСѓ'}
            </button>
            {practiceType === 'adventure' && (
              <button className="ghost-button" onClick={onJumpToTrials} type="button">
                РћС‚РєСЂС‹С‚СЊ РїРѕР»РёРіРѕРЅ
              </button>
            )}
          </div>

          {canFinish && (
            <motion.div animate={{ opacity: 1, y: 0 }} className="lesson-footer-note" initial={{ opacity: 0, y: 12 }}>
              {lesson.badgeText}
            </motion.div>
          )}
        </div>

        <AnimatedExamplePanel lesson={lesson} />
      </div>

      <div className="practice-shell">
        <div className="practice-header">
          <div>
            <span className="section-kicker">РџСЂР°РєС‚РёРєР°</span>
            <h3 className="section-title">РџРѕРїСЂРѕР±РѕРІР°С‚СЊ СЃР°РјРѕРјСѓ</h3>
          </div>
          <span className={`result-pill ${practiceReady ? 'is-success' : ''}`}>
            {practiceReady ? 'РЁР°Рі Р·Р°С‡С‚С‘РЅ' : 'Р–РґС‘С‚ РґРµР№СЃС‚РІРёСЏ'}
          </span>
        </div>

        {practiceType === 'quiz' && (
          <div className="practice-outcome">
            <strong>Р­С‚РѕС‚ СѓСЂРѕРє Р·Р°РєСЂРµРїР»СЏРµС‚СЃСЏ С‡РµСЂРµР· РєРѕСЂРѕС‚РєСѓСЋ РјРёРЅРё-РїСЂРѕРІРµСЂРєСѓ РЅРёР¶Рµ.</strong>
            <p>Р’С‹Р±РµСЂРё РІРµСЂРЅС‹Р№ РѕС‚РІРµС‚, С‡С‚РѕР±С‹ Р·Р°РєСЂС‹С‚СЊ РїСЂР°РєС‚РёС‡РµСЃРєРёР№ С€Р°Рі СѓСЂРѕРєР°.</p>
          </div>
        )}

        {practiceType === 'door-choice' && (
          <div className="practice-grid">
            <div className="choice-grid">
              {doorChoices.map((choice) => (
                <button
                  className="choice-button"
                  key={choice.id}
                  onClick={() => {
                    setDoorChoice(choice.id)
                    markPracticeInteraction()
                    playArcaneCue(soundEnabled, 'roll')
                  }}
                  type="button"
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <div className="practice-outcome">
              <strong>РЎРІРѕР±РѕРґР° РІС‹Р±РѕСЂР° Р·Р° СЃС‚РѕР»РѕРј</strong>
              <p>
                {doorChoice
                  ? doorChoices.find((choice) => choice.id === doorChoice)?.result
                  : 'Р’С‹Р±РµСЂРё Р»СЋР±РѕР№ РїРѕРґС…РѕРґ. D&D С†РµРЅРёС‚ РёРЅРёС†РёР°С‚РёРІСѓ, Р° РЅРµ РѕРґРёРЅ РїСЂР°РІРёР»СЊРЅС‹Р№ РѕС‚РІРµС‚.'}
              </p>
            </div>
          </div>
        )}

        {practiceType === 'dice' && (
          <DiceRoller
            onMilestone={() => markPracticeInteraction()}
            soundEnabled={soundEnabled}
          />
        )}

        {practiceType === 'skill-check' && (
          <SkillCheckDemo
            onResolve={() => markPracticeInteraction()}
            soundEnabled={soundEnabled}
          />
        )}

        {practiceType === 'abilities' && (
          <div className="practice-grid">
            <div className="practice-outcome">
              <strong>{ABILITY_MATCH_CHALLENGES[abilityIndex].prompt}</strong>
              <p>{ABILITY_MATCH_CHALLENGES[abilityIndex].note}</p>
            </div>
            <div className="choice-grid">
              {ABILITY_MATCH_CHALLENGES[abilityIndex].options.map((option) => (
                <button
                  className="choice-button"
                  key={option}
                  onClick={() => {
                    const correct = option === ABILITY_MATCH_CHALLENGES[abilityIndex].answer
                    setAbilityFeedback(
                      correct
                        ? 'РўРѕС‡РЅРѕ. Р­С‚Р° С…Р°СЂР°РєС‚РµСЂРёСЃС‚РёРєР° РѕС‰СѓС‰Р°РµС‚СЃСЏ РЅР°РёР±РѕР»РµРµ РµСЃС‚РµСЃС‚РІРµРЅРЅРѕ.'
                        : 'РџРѕС‡С‚Рё. РџРѕРґСѓРјР°Р№, РєР°РєРѕР№ С‚Р°Р»Р°РЅС‚ Р·РґРµСЃСЊ РЅСѓР¶РµРЅ РІ РїРµСЂРІСѓСЋ РѕС‡РµСЂРµРґСЊ.',
                    )
                    playArcaneCue(soundEnabled, correct ? 'success' : 'fail')
                    if (correct && abilityIndex < ABILITY_MATCH_CHALLENGES.length - 1) {
                      setAbilityIndex((previous) => previous + 1)
                    }
                    if (correct && abilityIndex === ABILITY_MATCH_CHALLENGES.length - 1) {
                      markPracticeInteraction()
                    }
                  }}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
            {abilityFeedback && <div className="practice-feedback success">{abilityFeedback}</div>}
          </div>
        )}

        {practiceType === 'modifiers' && (
          <div className="modifier-panel">
            <label htmlFor="modifier-score">РџРѕРґРІРёРіР°Р№ С…Р°СЂР°РєС‚РµСЂРёСЃС‚РёРєСѓ РіРµСЂРѕСЏ</label>
            <input
              id="modifier-score"
              max="18"
              min="8"
              onChange={(event) => {
                setModifierScore(Number(event.target.value))
                markPracticeInteraction()
              }}
              type="range"
              value={modifierScore}
            />
            <div className="modifier-value">
              <strong>{modifierScore}</strong>
              <span>{modifierValue >= 0 ? `+${modifierValue}` : modifierValue}</span>
            </div>
            <div className="modifier-marks">
              <span>8</span>
              <span>10</span>
              <span>14</span>
              <span>16</span>
              <span>18</span>
            </div>
          </div>
        )}

        {practiceType === 'classes' && (
          <ClassCards onSelect={() => markPracticeInteraction()} />
        )}

        {practiceType === 'combat' && (
          <CombatDemo onVictory={() => markPracticeInteraction()} soundEnabled={soundEnabled} title="РўСЂРµРЅРёСЂРѕРІРѕС‡РЅС‹Р№ Р±РѕР№" />
        )}

        {practiceType === 'armor-class' && (
          <div className="armor-demo">
            <strong>Р¦РµР»СЊ: РіРѕР±Р»РёРЅ СЃ AC {armorDc}</strong>
            <button
              className="btn-secondary"
              onClick={() => {
                const attack = rollDie(20) + 4
                const success = attack >= armorDc
                setArmorResult({ attack, success })
                markPracticeInteraction()
                playArcaneCue(soundEnabled, success ? 'success' : 'fail')
              }}
              type="button"
            >
              Р‘СЂРѕСЃРёС‚СЊ Р°С‚Р°РєСѓ
            </button>
            {armorResult && (
              <div className={`quiz-feedback ${armorResult.success ? 'success' : 'fail'}`}>
                РђС‚Р°РєР° = {armorResult.attack}.{' '}
                {armorResult.success ? 'РџРѕРїР°РґР°РЅРёРµ РїСЂРѕС€Р»Рѕ С‡РµСЂРµР· Р·Р°С‰РёС‚Сѓ.' : 'Р©РёС‚ РІС‹РґРµСЂР¶Р°Р» СѓРґР°СЂ.'}
              </div>
            )}
          </div>
        )}

        {practiceType === 'damage' && (
          <div className="damage-demo">
            <button
              className="btn-secondary"
              onClick={() => {
                const attack = rollDie(20) + 5
                const hit = attack >= armorDc
                setDamageState({ attack, damage: null, hit })
                markPracticeInteraction()
                playArcaneCue(soundEnabled, hit ? 'success' : 'fail')
              }}
              type="button"
            >
              РЁР°Рі 1: РїСЂРѕРІРµСЂРёС‚СЊ РїРѕРїР°РґР°РЅРёРµ
            </button>
            <button
              className="btn-secondary"
              disabled={!damageState.hit}
              onClick={() => {
                const damage = rollDie(8) + 2
                setDamageState((previous) => ({ ...previous, damage }))
                playArcaneCue(soundEnabled, 'roll')
              }}
              type="button"
            >
              РЁР°Рі 2: Р±СЂРѕСЃРёС‚СЊ СѓСЂРѕРЅ
            </button>
            <div className="damage-result">
              <span>РђС‚Р°РєР°: {damageState.attack ?? '--'}</span>
              <span>{damageState.hit ? 'РџРѕРїР°Р»' : damageState.attack ? 'РџСЂРѕРјР°С…' : 'Р–РґС‘С‚ Р±СЂРѕСЃРєР°'}</span>
              <strong>РЈСЂРѕРЅ: {damageState.damage ?? '--'}</strong>
            </div>
          </div>
        )}

        {practiceType === 'spells' && (
          <div className="practice-grid">
            <div className="spell-button-row">
              {SPELL_OPTIONS.map((spell) => (
                <button
                  className={`spell-button ${selectedSpellId === spell.id ? 'is-selected' : ''}`}
                  key={spell.id}
                  onClick={() => {
                    setSelectedSpellId(spell.id)
                    markPracticeInteraction()
                    playArcaneCue(soundEnabled, spell.id === 'fire-bolt' ? 'roll' : 'success')
                  }}
                  type="button"
                >
                  {spell.name}
                </button>
              ))}
            </div>
            <div className="spell-preview">
              <strong>{selectedSpell.description}</strong>
              <p>{selectedSpell.effect}</p>
            </div>
          </div>
        )}

        {practiceType === 'flow' && (
          <div className="practice-grid">
            <div className="choice-grid">
              {flowAvailable.map((step) => (
                <button
                  className="flow-chip"
                  key={step}
                  onClick={() => {
                    const expected = FLOW_STEPS[flowBuilt.length]
                    if (step === expected) {
                      const nextBuilt = [...flowBuilt, step]
                      setFlowBuilt(nextBuilt)
                      setFlowAvailable((previous) => previous.filter((item) => item !== step))
                      setFlowFeedback('РћС‚Р»РёС‡РЅРѕ. Р¦РµРїРѕС‡РєР° РґРІРёР¶РµС‚СЃСЏ РґР°Р»СЊС€Рµ.')
                      if (nextBuilt.length === FLOW_STEPS.length) {
                        markPracticeInteraction()
                        playArcaneCue(soundEnabled, 'success')
                      } else {
                        playArcaneCue(soundEnabled, 'roll')
                      }
                    } else {
                      setFlowFeedback('РџРѕРїСЂРѕР±СѓР№ РЅР°С‡Р°С‚СЊ СЃ РѕРїРёСЃР°РЅРёСЏ РјР°СЃС‚РµСЂР°.')
                      setFlowBuilt([])
                      setFlowAvailable(shuffle(FLOW_STEPS))
                      playArcaneCue(soundEnabled, 'fail')
                    }
                  }}
                  type="button"
                >
                  {step}
                </button>
              ))}
            </div>
            <div className="flow-slot">
              {flowBuilt.length
                ? flowBuilt.map((step) => <span key={step}>{step}</span>)
                : 'РЎРѕР±РµСЂРё РїСЂР°РІРёР»СЊРЅС‹Р№ РїРѕСЂСЏРґРѕРє С…РѕРґР° СЃС†РµРЅС‹'}
            </div>
            {flowFeedback && <div className="practice-feedback success">{flowFeedback}</div>}
          </div>
        )}

        {practiceType === 'adventure' && (
          <div className="adventure-callout">
            <strong>РћС‚РєСЂРѕР№ С‚СЂРµРЅРёСЂРѕРІРѕС‡РЅС‹Р№ РїРѕР»РёРіРѕРЅ</strong>
            <p>РќРёР¶Рµ С‚РµР±СЏ Р¶РґСѓС‚ С‚СЂРё РјРёРЅРё-СЃС†РµРЅС‹: СЃСѓРЅРґСѓРє, СЃС‚СЂР°Р¶РЅРёРє Рё РїРµСЂРІС‹Р№ Р±РѕР№.</p>
            <button className="btn-secondary" onClick={onJumpToTrials} type="button">
              РџРµСЂРµР№С‚Рё Рє РјРёРЅРё-РїСЂРёРєР»СЋС‡РµРЅРёСЋ
            </button>
          </div>
        )}

        {practiceType === 'final-exam' && (
          <FinalExam onComplete={() => markPracticeInteraction()} soundEnabled={soundEnabled} />
        )}
      </div>

      <div className="quiz-shell">
        <span className="section-kicker">РњРёРЅРё-РїСЂРѕРІРµСЂРєР°</span>
        <h3 className="quiz-question">{lessonQuiz.question}</h3>
        <div className="quiz-grid">
          {lessonQuiz.options.map((option) => (
            <button
              className={[
                'answer-button',
                option.id === selectedOptionId && option.correct ? 'is-correct' : '',
                option.id === selectedOptionId && !option.correct ? 'is-wrong' : '',
              ].filter(Boolean).join(' ')}
              key={option.id}
              onClick={() => answerQuiz(option.id)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
        {selectedQuizOption && (
          <div className={`quiz-feedback ${selectedQuizOption.correct ? 'success' : 'fail'}`}>
            {selectedQuizOption.feedback}
          </div>
        )}
      </div>

      <LessonMiniGame
        completed={lessonState.miniGame}
        lesson={lesson}
        onComplete={(payload) => onCompleteMiniGame(lesson.id, payload)}
        soundEnabled={soundEnabled}
      />
    </section>
  )
}

function AnimatedExamplePanel({ lesson }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setPhase((previous) => previous + 1), 1800)
    return () => window.clearInterval(timer)
  }, [])

  const tags = ['Р»РµСЃ', 'СЃСѓРЅРґСѓРє', 'С‚Р°РІРµСЂРЅР°', 'РґСЂР°РєРѕРЅ']
  const dice = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20']
  const selectedDie = phase % dice.length
  const spellState = SPELL_OPTIONS[phase % SPELL_OPTIONS.length]

  return (
    <aside className={`panel example-panel accent-${lesson.accent}`}>
      <span className="example-badge">РђРЅРёРјР°С†РёРѕРЅРЅС‹Р№ РїСЂРёРјРµСЂ</span>
      <strong className="scene-title">{sceneTitleMap[lesson.exampleType]}</strong>
      <div className={`scene-frame scene-${lesson.exampleType}`}>
        {lesson.exampleType === 'table' && (
          <div className="scene-table">
            <div className="scene-round-table" />
            <div className="scene-chair chair-top" />
            <div className="scene-chair chair-left" />
            <div className="scene-chair chair-right" />
            <div className="scene-chair chair-bottom" />
            <motion.div animate={{ opacity: [0.4, 1, 0.4], y: [0, -6, 0] }} className="scene-speech" transition={{ duration: 4.2, repeat: Infinity }}>
              РњР°СЃС‚РµСЂ: &quot;Р’РґР°Р»РµРєРµ СЃР»С‹С€РµРЅ СЂС‹Рє...&quot;
            </motion.div>
            {tags.map((tag, index) => (
              <motion.span
                animate={{ opacity: [0.25, 0.95, 0.25], y: [0, -10, 0] }}
                className={`scene-tag tag-${index + 1}`}
                key={tag}
                transition={{ delay: index * 0.2, duration: 3 + index * 0.4, repeat: Infinity }}
              >
                {tag}
              </motion.span>
            ))}
            <motion.div animate={{ rotate: [0, 180, 360], scale: [1, 1.08, 1] }} className="scene-die-token" transition={{ duration: 6.5, repeat: Infinity }}>
              d20
            </motion.div>
          </div>
        )}

        {lesson.exampleType === 'door' && (
          <div className="scene-door-wrap">
            <div className="scene-door-arch" />
            <motion.div animate={{ boxShadow: ['0 0 0 rgba(212,175,55,0.2)', '0 0 24px rgba(212,175,55,0.45)', '0 0 0 rgba(212,175,55,0.2)'] }} className="scene-door" transition={{ duration: 3.4, repeat: Infinity }} />
            {doorChoices.map((choice, index) => (
              <motion.span
                animate={{ opacity: phase % doorChoices.length === index ? 1 : 0.45, scale: phase % doorChoices.length === index ? 1.04 : 1 }}
                className={`scene-door-choice choice-${index + 1}`}
                key={choice.id}
              >
                {choice.label}
              </motion.span>
            ))}
          </div>
        )}

        {lesson.exampleType === 'dice' && (
          <div className="scene-dice-shelf">
            {dice.map((die, index) => (
              <motion.div animate={{ opacity: selectedDie === index ? 1 : 0.45, scale: selectedDie === index ? 1.08 : 1 }} className={`scene-dice-chip ${selectedDie === index ? 'is-active' : ''}`} key={die}>
                {die}
              </motion.div>
            ))}
            <motion.div animate={{ rotate: [0, 180, 360], y: [0, -8, 0] }} className="scene-dice-number" transition={{ duration: 3.8, repeat: Infinity }}>
              {[2, 4, 7, 9, 11, 17][selectedDie]}
            </motion.div>
          </div>
        )}

        {lesson.exampleType === 'skill-check' && (
          <div className="scene-wall-wrap">
            <div className="scene-wall" />
            <motion.div animate={{ y: [18, -18, 18] }} className="scene-climber" transition={{ duration: 3.2, repeat: Infinity }} />
            <div className="scene-equation">
              <span>d20 = 13</span>
              <span>+ Р›РѕРІРєРѕСЃС‚СЊ 2</span>
              <strong>15</strong>
              <small>DC 14</small>
            </div>
          </div>
        )}

        {lesson.exampleType === 'abilities' && (
          <div className="scene-sigil-grid">
            {['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map((sigil, index) => (
              <motion.div animate={{ y: [0, -6, 0] }} className="scene-sigil" key={sigil} transition={{ delay: index * 0.16, duration: 2.6, repeat: Infinity }}>
                {sigil}
              </motion.div>
            ))}
          </div>
        )}

        {lesson.exampleType === 'modifiers' && (
          <div className="scene-modifier">
            <div className="scene-mod-track">
              <motion.div animate={{ left: ['14%', '33%', '58%', '82%'][phase % 4] }} className="scene-marker" transition={{ duration: 0.45 }} />
            </div>
            <div className="scene-mod-labels">
              {['8 в†’ -1', '10 в†’ 0', '14 в†’ +2', '16 в†’ +3'].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        )}

        {lesson.exampleType === 'classes' && (
          <div className="scene-class-stack">
            {['Р’РѕРёРЅ', 'РњР°Рі', 'Р Р°Р·Р±РѕР№РЅРёРє', 'Р‘Р°СЂРґ'].map((item, index) => (
              <motion.div animate={{ opacity: phase % 4 === index ? 1 : 0.46, y: phase % 4 === index ? -4 : 0 }} className={`scene-class-card ${phase % 4 === index ? 'is-featured' : ''}`} key={item}>
                <span>{item}</span>
                <small>{phase % 4 === index ? 'РўРµРєСѓС‰РёР№ Р°СЂС…РµС‚РёРї' : 'РљР»Р°СЃСЃ'}</small>
              </motion.div>
            ))}
          </div>
        )}

        {lesson.exampleType === 'combat' && (
          <div className="scene-combat-strip">
            <div className="scene-avatar hero">Р“РµСЂРѕР№</div>
            <motion.div animate={{ opacity: [0.2, 1, 0.2], scaleX: [0.5, 1, 0.5] }} className="scene-slash" transition={{ duration: 1.8, repeat: Infinity }} />
            <div className="scene-avatar goblin">Р“РѕР±Р»РёРЅ</div>
            <div className="scene-combat-hud">
              <span>РђС‚Р°РєР° {phase % 2 === 0 ? 16 : 9}</span>
              <span>{phase % 2 === 0 ? 'РџРѕРїР°РґР°РЅРёРµ' : 'РџСЂРѕРјР°С…'}</span>
            </div>
          </div>
        )}

        {lesson.exampleType === 'armor' && (
          <div className="scene-armor-wrap">
            <div className="scene-shield">AC 13</div>
            <motion.div animate={{ opacity: [0.25, 1, 0.25], scale: [0.9, 1.08, 0.9], x: [-16, 16, -16] }} className="scene-impact" transition={{ duration: 2.4, repeat: Infinity }}>
              {phase % 2 === 0 ? '15' : '11'}
            </motion.div>
          </div>
        )}

        {lesson.exampleType === 'damage' && (
          <div className="scene-damage-wrap">
            <div className="scene-damage-bar">
              <motion.div animate={{ width: phase % 2 === 0 ? '38%' : '72%' }} className="scene-damage-fill" transition={{ duration: 0.45 }} />
            </div>
            <motion.div animate={{ rotate: [0, 180, 360] }} className="scene-damage-die" transition={{ duration: 4, repeat: Infinity }}>
              d8 = {phase % 2 === 0 ? 6 : 3}
            </motion.div>
          </div>
        )}

        {lesson.exampleType === 'spells' && (
          <div className="scene-spell-wrap">
            <div className="scene-spell-tabs">
              {SPELL_OPTIONS.map((spell) => (
                <span className={spell.name === spellState.name ? 'is-active' : ''} key={spell.id}>
                  {spell.name}
                </span>
              ))}
            </div>
            <motion.div animate={{ opacity: [0.6, 1, 0.6], scale: [0.95, 1.08, 0.95] }} className="scene-spell-orb" transition={{ duration: 2.3, repeat: Infinity }} />
            <strong>{spellState.effect}</strong>
          </div>
        )}

        {lesson.exampleType === 'flow' && (
          <div className="scene-flow-chain">
            {['РћРїРёСЃР°РЅРёРµ', 'Р’С‹Р±РѕСЂ', 'Р‘СЂРѕСЃРѕРє', 'РџРѕСЃР»РµРґСЃС‚РІРёРµ'].map((label, index) => (
              <motion.div animate={{ opacity: phase % 4 === index ? 1 : 0.45, scale: phase % 4 === index ? 1.05 : 1 }} className="scene-flow-node" key={label}>
                {label}
              </motion.div>
            ))}
          </div>
        )}

        {lesson.exampleType === 'adventure' && (
          <div className="scene-map-board">
            <div className="scene-map-path" />
            {['РЎСѓРЅРґСѓРє', 'РЎС‚СЂР°Р¶РЅРёРє', 'Р“РѕР±Р»РёРЅ'].map((node, index) => (
              <motion.div animate={{ opacity: phase % 3 === index ? 1 : 0.55, scale: phase % 3 === index ? 1.06 : 1 }} className="scene-map-node" key={node}>
                {node}
              </motion.div>
            ))}
          </div>
        )}

        {lesson.exampleType === 'exam' && (
          <div className="scene-exam-wrap">
            <motion.div animate={{ rotate: [0, 6, -6, 0], y: [0, -5, 0] }} className="scene-exam-badge" transition={{ duration: 3.4, repeat: Infinity }}>
              XP
            </motion.div>
            <div className="scene-exam-stars">
              <span className={phase % 3 === 0 ? 'is-active' : ''}>*</span>
              <span className={phase % 3 === 1 ? 'is-active' : ''}>*</span>
              <span className={phase % 3 === 2 ? 'is-active' : ''}>*</span>
            </div>
          </div>
        )}
      </div>
      <p className="scene-caption">{sceneCaptionMap[lesson.exampleType]}</p>
    </aside>
  )
}

function DiceRoller({ onMilestone, soundEnabled }) {
  const [selectedDie, setSelectedDie] = useState(20)
  const [result, setResult] = useState(null)
  const quality =
    result == null
      ? 'Р’С‹Р±РµСЂРё РєСѓР±РёРє Рё Р±СЂРѕСЃСЊ РµРіРѕ РІ Р·РѕРЅСѓ.'
      : selectedDie === 20 && result === 20
        ? 'РљСЂРёС‚РёС‡РµСЃРєРёР№ СѓСЃРїРµС…. Р—РѕР»РѕС‚Р°СЏ РІСЃРїС‹С€РєР° Р·Р°СЃР»СѓР¶РµРЅР°.'
        : selectedDie === 20 && result === 1
          ? 'РќР°С‚СѓСЂР°Р»СЊРЅР°СЏ РµРґРёРЅРёС†Р°. РћС‚Р»РёС‡РЅС‹Р№ РїРѕРІРѕРґ РґР»СЏ РґСЂР°РјР°С‚РёС‡РЅРѕРіРѕ РїСЂРѕРІР°Р»Р°.'
          : result >= Math.ceil(selectedDie * 0.75)
            ? 'РЎРёР»СЊРЅС‹Р№ СЂРµР·СѓР»СЊС‚Р°С‚. РўР°РєРѕР№ Р±СЂРѕСЃРѕРє РїСЂРёСЏС‚РЅРѕ СЃР»С‹С€Р°С‚СЊ Р·Р° СЃС‚РѕР»РѕРј.'
            : result <= Math.ceil(selectedDie * 0.25)
              ? 'РќРёР·РєРёР№ СЂРµР·СѓР»СЊС‚Р°С‚. Р—РґРµСЃСЊ СЂРѕР¶РґР°СЋС‚СЃСЏ РёРЅС‚РµСЂРµСЃРЅС‹Рµ РїРѕСЃР»РµРґСЃС‚РІРёСЏ.'
              : 'РќРѕСЂРјР°Р»СЊРЅС‹Р№ Р±СЂРѕСЃРѕРє. Р’ D&D РІР°Р¶РµРЅ РЅРµ С‚РѕР»СЊРєРѕ СЂРµР·СѓР»СЊС‚Р°С‚, РЅРѕ Рё РєРѕРЅС‚РµРєСЃС‚.'

  return (
    <div className="dice-roller">
      <div className="dice-grid">
        {[4, 6, 8, 10, 12, 20].map((die) => (
          <button
            className={`dice-chip ${selectedDie === die ? 'is-selected' : ''}`}
            key={die}
            onClick={() => setSelectedDie(die)}
            type="button"
          >
            d{die}
          </button>
        ))}
      </div>
      <div className="roll-stage">
        <div className="roll-copy">
          <span className="result-pill">РџСЂРѕРІРµСЂРѕС‡РЅР°СЏ С†РµР»СЊ</span>
          <strong>Р§Р°С‰Рµ РІСЃРµРіРѕ РґР»СЏ РїСЂРѕРІРµСЂРѕРє РЅСѓР¶РµРЅ d20</strong>
          <p>
            {selectedDie === 20
              ? 'Р­С‚РѕС‚ РєСѓР±РёРє С‡Р°С‰Рµ РІСЃРµРіРѕ РѕС‚РІРµС‡Р°РµС‚ РЅР° РІРѕРїСЂРѕСЃ: вЂњРЈРґР°Р»РѕСЃСЊ Р»Рё?вЂќ'
              : `d${selectedDie} С‡Р°С‰Рµ РїРѕРјРѕРіР°РµС‚ СѓСЂРѕРЅСѓ, Р»РµС‡РµРЅРёСЋ РёР»Рё СЌС„С„РµРєС‚Р°Рј.`}
          </p>
        </div>
        <button
          className="roll-polyhedron"
          onClick={() => {
            setResult(rollDie(selectedDie))
            playArcaneCue(soundEnabled, 'roll')
            if (selectedDie === 20) {
              onMilestone?.()
            }
          }}
          type="button"
        >
          d{selectedDie}
        </button>
        <div className="roll-result">
          <span>РўС‹ РІС‹Р±СЂРѕСЃРёР»</span>
          <strong>{result ?? '--'}</strong>
          <small>{quality}</small>
        </div>
      </div>
    </div>
  )
}

function SkillCheckDemo({ onResolve, soundEnabled }) {
  const [result, setResult] = useState(null)

  return (
    <div className="skill-check-demo">
      <div className="check-scene">
        <strong>РџРµСЂРµР»РµР·С‚СЊ С‡РµСЂРµР· СЃС‚РµРЅСѓ РєСЂРµРїРѕСЃС‚Рё</strong>
        <p>РќР°Р¶РјРё РЅР° Р±СЂРѕСЃРѕРє Рё РїРѕСЃРјРѕС‚СЂРё, РєР°Рє С„РѕСЂРјСѓР»Р° СЃРѕР±РёСЂР°РµС‚СЃСЏ РїСЂСЏРјРѕ РЅР° РіР»Р°Р·Р°С….</p>
      </div>
      <div className="check-row">
        <span>d20</span>
        <span>+</span>
        <span>Р±РѕРЅСѓСЃ +2</span>
        <span>=</span>
        <strong>{result ? result.total : '--'}</strong>
      </div>
      <div className="check-stat-line">
        <span>РЎР»РѕР¶РЅРѕСЃС‚СЊ СЃС†РµРЅС‹: DC 14</span>
        <span>{result ? (result.success ? 'РЈСЃРїРµС…' : 'РџРѕРєР° РЅРµ РІС‹С€Р»Рѕ') : 'РћР¶РёРґР°РЅРёРµ'}</span>
      </div>
      <div className="check-button-row">
        <button
          className="btn-secondary"
          onClick={() => {
            const roll = rollDie(20)
            const total = roll + 2
            const success = total >= 14
            setResult({ roll, success, total })
            onResolve?.(success)
            playArcaneCue(soundEnabled, success ? 'success' : 'fail')
          }}
          type="button"
        >
          Р‘СЂРѕСЃРёС‚СЊ СЃР°РјРѕРјСѓ
        </button>
        {result && (
          <span className={`practice-feedback ${result.success ? 'success' : 'fail'}`}>
            d20 = {result.roll}, РёС‚РѕРі = {result.total}
          </span>
        )}
      </div>
    </div>
  )
}

function ClassCards({ onSelect }) {
  const [selectedId, setSelectedId] = useState(CLASS_OPTIONS[0].id)
  const selectedClass =
    CLASS_OPTIONS.find((classOption) => classOption.id === selectedId) ?? CLASS_OPTIONS[0]

  useEffect(() => {
    onSelect?.(selectedClass)
  }, [onSelect, selectedClass])

  return (
    <div className="class-layout">
      <div className="class-grid">
        {CLASS_OPTIONS.map((classOption) => (
          <button
            className={`class-card ${classOption.id === selectedId ? 'is-selected' : ''}`}
            key={classOption.id}
            onClick={() => setSelectedId(classOption.id)}
            type="button"
          >
            <span className="class-sigil">{classOption.sigil}</span>
            <strong>{classOption.name}</strong>
            <p>{classOption.summary}</p>
            <small className="class-focus">{classOption.focus}</small>
          </button>
        ))}
      </div>
      <div className="practice-outcome">
        <strong>РўРµР±Рµ РјРѕР¶РµС‚ РїРѕРґРѕР№С‚Рё: {selectedClass.name}</strong>
        <p>{selectedClass.recommendation}</p>
        <div className="class-strengths">
          {selectedClass.strengths.map((strength) => (
            <span key={strength}>{strength}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

const combatInitialState = {
  enemyHp: 14,
  guard: false,
  log: ['Р‘СЂРѕСЃСЊ РёРЅРёС†РёР°С‚РёРІСѓ, С‡С‚РѕР±С‹ РЅР°С‡Р°С‚СЊ Р±РѕР№.'],
  playerHp: 18,
  started: false,
  turn: 'setup',
}

function CombatDemo({ onVictory, soundEnabled, title = 'РџРµСЂРІС‹Р№ Р±РѕР№' }) {
  const [state, setState] = useState(combatInitialState)
  const awardedRef = useRef(false)

  const addLog = (message, existingLog) => [message, ...existingLog].slice(0, 4)

  const finishIfNeeded = (nextState) => {
    if (nextState.enemyHp <= 0 && !awardedRef.current) {
      awardedRef.current = true
      onVictory?.()
    }
    return nextState
  }

  const enemyTurn = () => {
    setState((previous) => {
      if (previous.enemyHp <= 0 || previous.playerHp <= 0) {
        return previous
      }

      const attackRoll = rollDie(20) + 4
      const playerAc = previous.guard ? 15 : 12
      const hit = attackRoll >= playerAc
      const damage = hit ? Math.max(1, rollDie(6) + (previous.guard ? 0 : 1)) : 0

      playArcaneCue(soundEnabled, hit ? 'fail' : 'roll')

      return finishIfNeeded({
        ...previous,
        guard: false,
        log: addLog(
          hit
            ? `Р“РѕР±Р»РёРЅ РїРѕРїР°РґР°РµС‚ РЅР° ${attackRoll} Рё РЅР°РЅРѕСЃРёС‚ ${damage} СѓСЂРѕРЅР°.`
            : `Р“РѕР±Р»РёРЅ Р±СЊС‘С‚ РЅР° ${attackRoll}, РЅРѕ С‚С‹ РІС‹РґРµСЂР¶РёРІР°РµС€СЊ РЅР°С‚РёСЃРє.`,
          previous.log,
        ),
        playerHp: Math.max(0, previous.playerHp - damage),
        turn: previous.playerHp - damage <= 0 ? 'finished' : 'player',
      })
    })
  }

  const startFight = () => {
    const playerInitiative = rollDie(20) + 2
    const enemyInitiative = rollDie(20) + 1
    const playerStarts = playerInitiative >= enemyInitiative

    setState((previous) => ({
      ...previous,
      log: addLog(
        `РРЅРёС†РёР°С‚РёРІР°: С‚С‹ ${playerInitiative}, РіРѕР±Р»РёРЅ ${enemyInitiative}. ${
          playerStarts ? 'РўРІРѕР№ С…РѕРґ.' : 'Р“РѕР±Р»РёРЅ СѓСЃРїРµРІР°РµС‚ РїРµСЂРІС‹Рј.'
        }`,
        previous.log,
      ),
      started: true,
      turn: playerStarts ? 'player' : 'enemy',
    }))

    playArcaneCue(soundEnabled, 'roll')
    if (!playerStarts) {
      window.setTimeout(enemyTurn, 320)
    }
  }

  const takeAction = (action) => {
    setState((previous) => {
      if (previous.turn !== 'player' || previous.enemyHp <= 0 || previous.playerHp <= 0) {
        return previous
      }

      if (action === 'attack') {
        const attackRoll = rollDie(20) + 4
        const hit = attackRoll >= 13
        const damage = hit ? rollDie(6) + 2 : 0
        playArcaneCue(soundEnabled, hit ? 'success' : 'fail')
        return finishIfNeeded({
          ...previous,
          enemyHp: Math.max(0, previous.enemyHp - damage),
          log: addLog(
            hit
              ? `РўС‹ РїРѕРїР°РґР°РµС€СЊ РЅР° ${attackRoll} Рё СЃРЅРёРјР°РµС€СЊ ${damage} HP.`
              : `РўС‹ Р°С‚Р°РєСѓРµС€СЊ РЅР° ${attackRoll}, РЅРѕ РіРѕР±Р»РёРЅ СѓРІРѕСЂР°С‡РёРІР°РµС‚СЃСЏ.`,
            previous.log,
          ),
          turn: 'enemy',
        })
      }

      if (action === 'guard') {
        playArcaneCue(soundEnabled, 'roll')
        return {
          ...previous,
          guard: true,
          log: addLog('РўС‹ РїРѕРґРЅРёРјР°РµС€СЊ Р·Р°С‰РёС‚Сѓ Рё РіРѕС‚РѕРІРёС€СЊСЃСЏ Рє РѕС‚РІРµС‚РЅРѕРјСѓ СѓРґР°СЂСѓ.', previous.log),
          turn: 'enemy',
        }
      }

      playArcaneCue(soundEnabled, 'roll')
      return {
        ...previous,
        log: addLog('РўС‹ РѕС‚СЃС‚СѓРїР°РµС€СЊ РЅР° С€Р°Рі Рё РІС‹РёРіСЂС‹РІР°РµС€СЊ РєРѕСЂРѕС‚РєСѓСЋ РїРµСЂРµРґС‹С€РєСѓ.', previous.log),
        playerHp: Math.min(18, previous.playerHp + 1),
        turn: 'enemy',
      }
    })

    window.setTimeout(enemyTurn, 320)
  }

  const playerPercent = `${(state.playerHp / 18) * 100}%`
  const enemyPercent = `${(state.enemyHp / 14) * 100}%`

  return (
    <article className="trial-card combat-demo">
      <div className="combat-header">
        <div>
          <span className="section-kicker">Р‘РѕРµРІР°СЏ РїСЂР°РєС‚РёРєР°</span>
          <h3 className="trial-title">{title}</h3>
        </div>
        <button
          className="tiny-button"
          onClick={() => {
            awardedRef.current = false
            setState(combatInitialState)
          }}
          type="button"
        >
          РЎР±СЂРѕСЃРёС‚СЊ
        </button>
      </div>

      <div className="combat-health">
        <div>
          <span>Р“РµСЂРѕР№</span>
          <div className="health-track">
            <div className="health-fill player" style={{ width: playerPercent }} />
          </div>
          <small>{state.playerHp} HP</small>
        </div>
        <div>
          <span>Р“РѕР±Р»РёРЅ</span>
          <div className="health-track">
            <div className="health-fill enemy" style={{ width: enemyPercent }} />
          </div>
          <small>{state.enemyHp} HP</small>
        </div>
      </div>

      <div className="combat-body">
        <div className="combat-avatar hero">РўС‹</div>
        <div className="combat-avatar goblin">Р“РѕР±Р»РёРЅ</div>
      </div>

      <div className="combat-actions">
        {!state.started ? (
          <button className="btn-secondary" onClick={startFight} type="button">
            Р‘СЂРѕСЃРёС‚СЊ РёРЅРёС†РёР°С‚РёРІСѓ
          </button>
        ) : (
          <>
            <button className="tiny-button" onClick={() => takeAction('attack')} type="button">
              РђС‚Р°РєРѕРІР°С‚СЊ
            </button>
            <button className="tiny-button" onClick={() => takeAction('guard')} type="button">
              Р—Р°С‰РёС‚РёС‚СЊСЃСЏ
            </button>
            <button className="tiny-button" onClick={() => takeAction('retreat')} type="button">
              РћС‚РѕР№С‚Рё
            </button>
          </>
        )}
      </div>

      <div className="combat-log">
        {state.log.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </article>
  )
}

function MiniGameCard({ actions, description, onOutcome, soundEnabled, title }) {
  const [result, setResult] = useState(null)

  const handleAction = (action) => {
    if (action.id === 'leave') {
      setResult({
        ability: action.ability,
        message: action.success,
        roll: '--',
        total: '--',
      })
      onOutcome?.({ success: false, xpReward: 20 })
      return
    }

    const roll = rollDie(20)
    const total = roll + action.bonus
    const success = total >= action.dc

    setResult({
      ability: action.ability,
      message: success ? action.success : action.failure,
      roll,
      total,
    })

    onOutcome?.({
      achievementId: success ? action.achievementId : null,
      success,
      xpReward: 40,
    })
    playArcaneCue(soundEnabled, success ? 'success' : 'fail')
  }

  return (
    <article className="trial-card">
      <span className="section-kicker">РњРёРЅРё-РёРіСЂР°</span>
      <h3 className="trial-title">{title}</h3>
      <p>{description}</p>
      <div className="trial-options">
        {actions.map((action) => (
          <button className="tiny-button" key={action.id} onClick={() => handleAction(action)} type="button">
            {action.label}
          </button>
        ))}
      </div>
      <div className="trial-result">
        {result ? (
          <>
            <div className="trial-roll-line">
              <span>{result.ability}</span>
              <span>d20: {result.roll}</span>
              <span>РС‚РѕРі: {result.total}</span>
            </div>
            <p>{result.message}</p>
          </>
        ) : (
          <p>Р’С‹Р±РµСЂРё РїРѕРґС…РѕРґ Рё РїРѕСЃРјРѕС‚СЂРё, РєР°Рє РєСѓР±РёРє, Р±РѕРЅСѓСЃ Рё СЃС†РµРЅР° СЃРѕР±РёСЂР°СЋС‚СЃСЏ РІ РѕРґРЅРѕ РїСЂРёРєР»СЋС‡РµРЅРёРµ.</p>
        )}
      </div>
    </article>
  )
}

function FinalExam({ onComplete, soundEnabled }) {
  const [answers, setAnswers] = useState({})
  const completionRef = useRef(false)
  const score = FINAL_EXAM_QUESTIONS.reduce((total, question) => {
    const option = question.options.find((item) => item.id === answers[question.id])
    return total + (option?.correct ? 1 : 0)
  }, 0)
  const completed = Object.keys(answers).length === FINAL_EXAM_QUESTIONS.length
  const passed = completed && score >= 2

  useEffect(() => {
    if (!passed || completionRef.current) {
      return
    }

    completionRef.current = true
    onComplete?.(true)
    playArcaneCue(soundEnabled, 'achievement')
  }, [onComplete, passed, soundEnabled])

  return (
    <div className="exam-shell">
      {FINAL_EXAM_QUESTIONS.map((question) => (
        <div className="drawer-item" key={question.id}>
          <strong>{question.question}</strong>
          <div className="quiz-grid">
            {question.options.map((option) => (
              <button
                className={`answer-button ${answers[question.id] === option.id ? 'is-selected' : ''}`}
                key={option.id}
                onClick={() =>
                  setAnswers((previous) => ({
                    ...previous,
                    [question.id]: option.id,
                  }))
                }
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ))}
      {completed && (
        <div className={`quiz-feedback ${passed ? 'success' : 'fail'}`}>
          Р РµР·СѓР»СЊС‚Р°С‚: {score} / {FINAL_EXAM_QUESTIONS.length}.{' '}
          {passed
            ? 'РўС‹ РіРѕС‚РѕРІ Рє РїРµСЂРІРѕР№ РЅР°СЃС‚РѕСЏС‰РµР№ СЃРµСЃСЃРёРё.'
            : 'РќРёС‡РµРіРѕ СЃС‚СЂР°С€РЅРѕРіРѕ: РїРѕРїСЂРѕР±СѓР№ РµС‰С‘ СЂР°Р· РёР»Рё РІРµСЂРЅРёСЃСЊ Рє СѓСЂРѕРєР°Рј.'}
        </div>
      )}
    </div>
  )
}

function GlossaryDrawer({ glossary, mode, onClose, open, quickReference }) {
  const [activeTab, setActiveTab] = useState(mode)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    setActiveTab(mode)
  }, [mode])

  const filteredGlossary = useMemo(() => {
    if (!deferredQuery) {
      return glossary
    }
    const normalized = deferredQuery.toLowerCase()
    return glossary.filter(
      (item) =>
        item.term.toLowerCase().includes(normalized) ||
        item.definition.toLowerCase().includes(normalized),
    )
  }, [deferredQuery, glossary])

  return (
    <AnimatePresence>
      {open && (
        <motion.div animate={{ opacity: 1 }} className="drawer-overlay" exit={{ opacity: 0 }} initial={{ opacity: 0 }} onClick={onClose}>
          <motion.aside animate={{ x: 0 }} className="drawer-panel" exit={{ x: 48 }} initial={{ x: 48 }} onClick={(event) => event.stopPropagation()} transition={{ duration: 0.3 }}>
            <div className="drawer-header">
              <div>
                <span className="section-kicker">РџРѕРґ СЂСѓРєРѕР№</span>
                <h3 className="section-title">РЎР»РѕРІР°СЂСЊ Рё Р±С‹СЃС‚СЂС‹Р№ СЃРїСЂР°РІРѕС‡РЅРёРє</h3>
              </div>
              <button className="tiny-button" onClick={onClose} type="button">
                Р—Р°РєСЂС‹С‚СЊ
              </button>
            </div>

            <div className="drawer-tabs">
              <button className={`drawer-tab ${activeTab === 'glossary' ? 'is-active' : ''}`} onClick={() => setActiveTab('glossary')} type="button">
                РЎР»РѕРІР°СЂСЊ
              </button>
              <button className={`drawer-tab ${activeTab === 'reference' ? 'is-active' : ''}`} onClick={() => setActiveTab('reference')} type="button">
                Р‘С‹СЃС‚СЂС‹Р№ СЃРїСЂР°РІРѕС‡РЅРёРє
              </button>
            </div>

            {activeTab === 'glossary' && (
              <>
                <input
                  className="drawer-search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="РСЃРєР°С‚СЊ С‚РµСЂРјРёРЅ..."
                  type="search"
                  value={query}
                />
                <div className="drawer-list">
                  {filteredGlossary.map((item) => (
                    <article className="drawer-item" key={item.term}>
                      <strong>{item.term}</strong>
                      <p>{item.definition}</p>
                    </article>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'reference' && (
              <div className="reference-grid">
                {quickReference.map((section) => (
                  <article className="reference-card" key={section.title}>
                    <strong>{section.title}</strong>
                    <div className="lesson-bullet-list">
                      {section.items.map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AchievementPopup({ achievement, onClose }) {
  useEffect(() => {
    if (!achievement) {
      return undefined
    }
    const timer = window.setTimeout(onClose, 2800)
    return () => window.clearTimeout(timer)
  }, [achievement, onClose])

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div animate={{ opacity: 1, y: 0 }} className="achievement-popup" exit={{ opacity: 0, y: 12 }} initial={{ opacity: 0, y: 18 }}>
          <div className="achievement-glyph">{achievement.glyph}</div>
          <div className="achievement-copy">
            <span>РќРѕРІРѕРµ РґРѕСЃС‚РёР¶РµРЅРёРµ</span>
            <strong>{achievement.title}</strong>
            <small>{achievement.description}</small>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function OnboardingModal({ onEnter }) {
  const cards = [
    { step: 'I', text: 'РўС‹ РЅРёРєРѕРіРґР° РЅРµ РёРіСЂР°Р» РІ D&D? Р­С‚Рѕ РЅРѕСЂРјР°Р»СЊРЅРѕ.' },
    { step: 'II', text: 'Р—РґРµСЃСЊ С‚С‹ СѓС‡РёС€СЊСЃСЏ С‡РµСЂРµР· РєРѕСЂРѕС‚РєРёРµ СѓСЂРѕРєРё, РІРёР·СѓР°Р»СЊРЅС‹Рµ СЃС†РµРЅС‹ Рё РёРЅС‚РµСЂР°РєС‚РёРІ.' },
    { step: 'III', text: 'РќР°С‡РЅС‘Рј СЃ СЃР°РјРѕРіРѕ РїСЂРѕСЃС‚РѕРіРѕ вЂ” С‡С‚Рѕ РІРѕРѕР±С‰Рµ РїСЂРѕРёСЃС…РѕРґРёС‚ РІ РёРіСЂРµ.' },
  ]

  return (
    <div className="onboarding-overlay">
      <motion.div animate={{ opacity: 1, scale: 1 }} className="onboarding-panel" initial={{ opacity: 0, scale: 0.94 }}>
        <span className="section-kicker">РџРµСЂРІС‹Р№ РІС…РѕРґ</span>
        <h3 className="section-title">Р”РѕР±СЂРѕ РїРѕР¶Р°Р»РѕРІР°С‚СЊ РІ Р°РєР°РґРµРјРёСЋ</h3>
        <div className="onboarding-grid">
          {cards.map((card) => (
            <article className="onboarding-card" key={card.step}>
              <span className="onboarding-card-step">{card.step}</span>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
        <button className="btn-primary" onClick={onEnter} type="button">
          Р’РѕР№С‚Рё РІ Р°РєР°РґРµРјРёСЋ
        </button>
      </motion.div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <strong>D&amp;D Academy</strong>
          <p className="footer-note">
            Р¤СЌРЅС‚РµР·РёР№РЅС‹Р№ РєСѓСЂСЃ РґР»СЏ РЅРѕРІРёС‡РєРѕРІ: РєРѕСЂРѕС‚РєРёРµ СѓСЂРѕРєРё, Р°РЅРёРјРёСЂРѕРІР°РЅРЅС‹Рµ РїСЂРёРјРµСЂС‹, РјСЏРіРєР°СЏ РіРµР№РјРёС„РёРєР°С†РёСЏ Рё РїРµСЂРІС‹Р№ Р±РµР·РѕРїР°СЃРЅС‹Р№ РІС…РѕРґ РІ РјРёСЂ D&amp;D.
          </p>
        </div>
        <div>
          <strong>Р§С‚Рѕ СѓР¶Рµ РµСЃС‚СЊ</strong>
          <p className="footer-note">
            Hero, onboarding, РєР°СЂС‚Р° РѕР±СѓС‡РµРЅРёСЏ, РїСЂРѕРіСЂРµСЃСЃ, РјРёРЅРё-РёРіСЂС‹, СЃР»РѕРІР°СЂСЊ, localStorage Рё РїРѕРґРіРѕС‚РѕРІРєР° Рє РґРµРїР»РѕСЋ РЅР° GitHub Pages.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default App


