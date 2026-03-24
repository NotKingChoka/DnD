let audioContext

const storageKey = 'dnd-academy-progress-v1'
const lessonStepKeys = ['theory', 'example', 'practice', 'miniGame']

const cueMap = {
  achievement: [
    { delay: 0, duration: 0.08, frequency: 587, gain: 0.016, type: 'triangle' },
    { delay: 0.08, duration: 0.11, frequency: 784, gain: 0.014, type: 'triangle' },
    { delay: 0.18, duration: 0.14, frequency: 988, gain: 0.014, type: 'sine' },
  ],
  fail: [
    { delay: 0, duration: 0.11, frequency: 220, gain: 0.014, type: 'sawtooth' },
    { delay: 0.08, duration: 0.12, frequency: 164, gain: 0.012, type: 'triangle' },
  ],
  roll: [
    { delay: 0, duration: 0.05, frequency: 460, gain: 0.013, type: 'triangle' },
    { delay: 0.04, duration: 0.05, frequency: 510, gain: 0.012, type: 'triangle' },
    { delay: 0.09, duration: 0.08, frequency: 620, gain: 0.01, type: 'sine' },
  ],
  success: [
    { delay: 0, duration: 0.07, frequency: 523, gain: 0.015, type: 'triangle' },
    { delay: 0.06, duration: 0.12, frequency: 659, gain: 0.013, type: 'sine' },
  ],
}

const todayStamp = (date = new Date()) => date.toISOString().slice(0, 10)

const yesterdayStamp = (date = new Date()) => {
  const copy = new Date(date)
  copy.setDate(copy.getDate() - 1)
  return todayStamp(copy)
}

export function calculateLevel(xp) {
  return Math.floor(xp / 180) + 1
}

export function createLessonStepState(completed = false) {
  return {
    theory: completed,
    example: completed,
    practice: completed,
    miniGame: completed,
  }
}

export function createLessonStepStates(lessons, completedLessonIds = []) {
  const completedSet = new Set(completedLessonIds)

  return Object.fromEntries(
    lessons.map((lesson) => [lesson.id, createLessonStepState(completedSet.has(lesson.id))]),
  )
}

export function createDefaultProgress(lessons) {
  return {
    achievements: [],
    completedLessonIds: [],
    currentLessonId: lessons[0]?.id ?? null,
    introSeen: false,
    lastVisit: todayStamp(),
    lessonStepStates: createLessonStepStates(lessons),
    newbieMode: true,
    selectedLessonId: lessons[0]?.id ?? null,
    soundEnabled: false,
    streak: 1,
    trialsCompleted: {
      chest: false,
      combat: false,
      guard: false,
    },
    view: 'hero',
    xp: 0,
  }
}

export function loadProgress(lessons) {
  if (typeof window === 'undefined') {
    return createDefaultProgress(lessons)
  }

  try {
    const raw = window.localStorage.getItem(storageKey)
    const fallback = createDefaultProgress(lessons)

    if (!raw) {
      return fallback
    }

    const parsed = JSON.parse(raw)
    const lessonIds = new Set(lessons.map((lesson) => lesson.id))
    const completedLessonIds = Array.isArray(parsed.completedLessonIds)
      ? parsed.completedLessonIds.filter((lessonId) => lessonIds.has(lessonId))
      : []
    const parsedLessonStepStates =
      parsed.lessonStepStates && typeof parsed.lessonStepStates === 'object'
        ? parsed.lessonStepStates
        : {}
    const lessonStepStates = Object.fromEntries(
      lessons.map((lesson) => {
        const completed = completedLessonIds.includes(lesson.id)
        const fallbackState = createLessonStepState(completed)
        const parsedState =
          parsedLessonStepStates[lesson.id] && typeof parsedLessonStepStates[lesson.id] === 'object'
            ? parsedLessonStepStates[lesson.id]
            : {}

        return [
          lesson.id,
          lessonStepKeys.reduce(
            (state, key) => ({
              ...state,
              [key]: completed ? true : Boolean(parsedState[key] ?? fallbackState[key]),
            }),
            fallbackState,
          ),
        ]
      }),
    )

    const today = todayStamp()
    const lastVisit = typeof parsed.lastVisit === 'string' ? parsed.lastVisit : today
    const streak =
      lastVisit === today
        ? Number(parsed.streak) || 1
        : lastVisit === yesterdayStamp()
          ? (Number(parsed.streak) || 0) + 1
          : 1

    return {
      ...fallback,
      ...parsed,
      completedLessonIds,
      currentLessonId:
        lessons.find((lesson) => !completedLessonIds.includes(lesson.id))?.id ??
        lessons[lessons.length - 1]?.id ??
        lessons[0]?.id,
      lastVisit: today,
      lessonStepStates,
      selectedLessonId:
        lessonIds.has(parsed.selectedLessonId)
          ? parsed.selectedLessonId
          : completedLessonIds.at(-1) ?? lessons[0]?.id,
      streak,
      trialsCompleted: {
        ...fallback.trialsCompleted,
        ...(parsed.trialsCompleted || {}),
      },
      xp: Number.isFinite(parsed.xp) ? parsed.xp : 0,
    }
  } catch {
    return createDefaultProgress(lessons)
  }
}

export function saveProgress(progress) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(progress))
}

export function playArcaneCue(enabled, type = 'success') {
  if (!enabled || typeof window === 'undefined') {
    return
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext

  if (!AudioContextClass) {
    return
  }

  audioContext ??= new AudioContextClass()

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {})
  }

  const notes = cueMap[type] ?? cueMap.success
  const master = audioContext.createGain()
  master.gain.value = 0.7
  master.connect(audioContext.destination)

  notes.forEach((note) => {
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()
    const start = audioContext.currentTime + note.delay

    oscillator.type = note.type
    oscillator.frequency.setValueAtTime(note.frequency, start)
    gain.gain.setValueAtTime(note.gain, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.duration)

    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start(start)
    oscillator.stop(start + note.duration + 0.03)
  })
}

export function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1
}

export function shuffle(items) {
  const copy = [...items]

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }

  return copy
}
