import { AnimatePresence, motion } from 'framer-motion'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  Award,
  BookOpen,
  ChevronRight,
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
  createDefaultProgress,
  loadProgress,
  playArcaneCue,
  rollDie,
  saveProgress,
  shuffle,
} from './utils'

const particles = Array.from({ length: 14 }, (_, index) => ({
  delay: index * 0.4,
  duration: 7 + (index % 4) * 1.3,
  id: index,
  size: 3 + (index % 3) * 2,
  x: 8 + index * 6.2,
  y: 10 + (index % 5) * 14,
}))

const sceneTitleMap = {
  abilities: 'Сигилы характеристик',
  adventure: 'Карта мини-приключения',
  armor: 'Попадание по щиту',
  classes: 'Архетипы героев',
  combat: 'Удар по гоблину',
  damage: 'Урон после попадания',
  dice: 'Полка кубиков',
  door: 'Свобода выбора',
  exam: 'Посвящение ученика',
  flow: 'Ритм сессии',
  modifiers: 'Панель модификатора',
  'skill-check': 'Проверка на стене',
  spells: 'Три базовых заклинания',
  table: 'Воображение над столом',
}

const sceneCaptionMap = {
  abilities: 'Шесть характеристик оживают как эмблемы и подсказывают стиль героя.',
  adventure: 'В одном маленьком маршруте уже живут выбор, кубики и последствия.',
  armor: 'Число атаки сталкивается со щитом AC и сразу показывает, прошёл ли удар.',
  classes: 'Каждый класс ощущается как отдельный путь героя, а не просто набор цифр.',
  combat: 'Бой строится из понятных шагов: инициатива, атака, попадание, урон.',
  damage: 'После точного удара игра отдельно показывает кубик урона и падение HP.',
  dice: 'd20 сияет как главный кубик проверок, а остальные добавляют вкус урону и эффектам.',
  door: 'Игроки могут осмотреть дверь, постучать, взломать или придумать свой вариант.',
  exam: 'Финал курса чувствуется как посвящение, а не как сухой тест.',
  flow: 'Сессия течёт как цепочка: описание, выбор, бросок, последствия.',
  modifiers: 'Бонусы рождаются из характеристик и мягко меняют шанс успеха.',
  'skill-check': 'Итог складывается на глазах: d20, бонус и сложность встречаются в одной точке.',
  spells: 'Магия может жечь, исцелять или защищать — и это видно без длинных таблиц.',
  table: 'Мастер говорит, а над столом оживают лес, дракон, сундук и таверна.',
}

const doorChoices = [
  {
    id: 'inspect',
    label: 'Осмотреть дверь',
    result: 'Ты замечаешь стёртые руны у замка. Похоже, здесь мог быть магический механизм.',
  },
  {
    id: 'knock',
    label: 'Постучать',
    result: 'С той стороны раздаётся глухой отголосок. За дверью точно есть пространство.',
  },
  {
    id: 'bash',
    label: 'Выбить',
    result: 'Дверь дрожит, пыль сыплется вниз, но теперь все вокруг знают, что вы здесь.',
  },
  {
    id: 'trap',
    label: 'Поискать ловушку',
    result: 'У нижней петли ты замечаешь подозрительную леску. Отличный повод быть осторожнее.',
  },
]

const chestActions = [
  {
    id: 'inspect',
    label: 'Осмотреть',
    bonus: 2,
    dc: 13,
    ability: 'Мудрость',
    success: 'Ты замечаешь скрытую иглу и безопасно открываешь механизм. Внутри золото и старый жетон.',
    failure: 'Ты не замечаешь подвоха. Игла щёлкает, крышка остаётся закрытой.',
    achievementId: 'chest-opened',
  },
  {
    id: 'pick',
    label: 'Вскрыть инструментами',
    bonus: 4,
    dc: 14,
    ability: 'Ловкость',
    success: 'Отмычка поворачивается, замок сдаётся, а крышка плавно поднимается вверх.',
    failure: 'Инструмент срывается. Механизм пока не поддался.',
    achievementId: 'chest-opened',
  },
  {
    id: 'smash',
    label: 'Разбить',
    bonus: 3,
    dc: 12,
    ability: 'Сила',
    success: 'Доски трескаются, сундук раскрывается, а внутри звенят монеты.',
    failure: 'Сундук дрожит, но устоял. Шум вышел грозным, а результат пока скромный.',
    achievementId: 'chest-opened',
  },
  {
    id: 'leave',
    label: 'Оставить',
    bonus: 0,
    dc: 0,
    ability: 'Осторожность',
    success: 'Иногда лучший ход — пройти мимо и сохранить силы для другой сцены.',
    failure: '',
  },
]

const guardActions = [
  {
    id: 'persuade',
    label: 'Убедить',
    bonus: 3,
    dc: 13,
    ability: 'Харизма',
    success: 'Стражник расслабляется и пропускает вас к воротам.',
    failure: 'Он качает головой и просит говорить по существу.',
    achievementId: 'silver-tongue',
  },
  {
    id: 'deceive',
    label: 'Обмануть',
    bonus: 4,
    dc: 14,
    ability: 'Обман',
    success: 'Ложь звучит достаточно уверенно, и стражник делает шаг в сторону.',
    failure: 'Стражник прищуривается. История звучит подозрительно.',
    achievementId: 'silver-tongue',
  },
  {
    id: 'intimidate',
    label: 'Запугать',
    bonus: 2,
    dc: 15,
    ability: 'Запугивание',
    success: 'Стражник не хочет проблем и уступает проход.',
    failure: 'Он кладёт руку на копьё и явно ждёт продолжения.',
    achievementId: 'silver-tongue',
  },
  {
    id: 'leave',
    label: 'Уйти',
    bonus: 0,
    dc: 0,
    ability: 'Тактика',
    success: 'Иногда тактическое отступление тоже разумное решение.',
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

  const selectLesson = (lessonId) => {
    const index = LESSONS.findIndex((lesson) => lesson.id === lessonId)
    if (index >= unlockedCount && !completedSet.has(lessonId)) {
      return
    }
    setProgress((previous) => ({ ...previous, view: 'academy', selectedLessonId: lessonId }))
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
              completedSet={completedSet}
              lesson={selectedLesson}
              newbieMode={progress.newbieMode}
              onCompleteLesson={completeLesson}
              onJumpToTrials={() => scrollTo(trialsRef)}
              soundEnabled={progress.soundEnabled}
            />

            <section className="panel trial-section" ref={trialsRef}>
              <div className="section-heading">
                <div>
                  <span className="section-kicker">Полевые тренировки</span>
                  <h2 className="section-title">Мини-игры и живая практика</h2>
                  <p className="section-subtitle">
                    Здесь теория превращается в опыт: сундук, переговоры и первый бой.
                  </p>
                </div>
              </div>

              <div className="trial-grid">
                <MiniGameCard
                  actions={chestActions}
                  description="Перед тобой древний запертый сундук. Реши, как герой попробует справиться с ним."
                  onOutcome={(payload) => registerTrial({ ...payload, trialId: 'chest' })}
                  soundEnabled={progress.soundEnabled}
                  title="Старый сундук"
                />
                <MiniGameCard
                  actions={guardActions}
                  description="Перед воротами стоит настороженный стражник. Каким тоном герой попробует проложить путь?"
                  onOutcome={(payload) => registerTrial({ ...payload, trialId: 'guard' })}
                  soundEnabled={progress.soundEnabled}
                  title="Стражник у ворот"
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
                  title="Первый бой"
                />
              </div>
            </section>
          </div>
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
          <small>Школа приключенца</small>
        </span>
      </button>

      <div className="topbar-status">
        <span className="status-pill">Lv. {level}</span>
        <span className="status-pill">{progressPercent}% курса</span>
        <span className="status-pill">{streak} day streak</span>
      </div>

      <div className="topbar-actions">
        <button className="icon-button" onClick={onContinue} type="button">
          <ChevronRight size={16} />
          <span>{view === 'hero' ? 'Продолжить курс' : 'К текущему уроку'}</span>
        </button>

        <button className="icon-button" onClick={onOpenReference} type="button">
          <ScrollText size={16} />
          <span>Справочник</span>
        </button>

        <button className="icon-button" onClick={onOpenGlossary} type="button">
          <BookOpen size={16} />
          <span>Словарь</span>
        </button>

        <button
          className={`toggle-pill ${newbieMode ? 'is-active' : ''}`}
          onClick={onToggleNewbie}
          type="button"
        >
          <Award size={16} />
          <span>Я совсем новичок</span>
        </button>

        <button className="toggle-pill" onClick={onToggleSound} type="button">
          {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{soundEnabled ? 'Звук включён' : 'Звук выключен'}</span>
        </button>
      </div>
    </header>
  )
}

function HeroSection({
  achievementsCount,
  lessonsCount,
  onHowItWorks,
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
          Академия приключенцев для новичков
        </motion.span>
        <motion.h1 animate={{ opacity: 1, y: 0 }} className="hero-title" initial={{ opacity: 0, y: 22 }}>
          Изучи Dungeons &amp; Dragons с нуля
        </motion.h1>
        <motion.p animate={{ opacity: 1, y: 0 }} className="hero-subtitle" initial={{ opacity: 0, y: 18 }}>
          Пойми кубики, проверки, бой, классы и саму суть игры — легко, красиво и шаг за шагом.
        </motion.p>
        <motion.div animate={{ opacity: 1, y: 0 }} className="hero-actions" initial={{ opacity: 0, y: 18 }}>
          <button className="btn-primary" onClick={onStart} type="button">
            Начать приключение
          </button>
          <button className="btn-secondary" onClick={onHowItWorks} type="button">
            Посмотреть как это работает
          </button>
        </motion.div>

        <div className="hero-meta-grid">
          <div className="hero-meta-card">
            <strong>{lessonsCount}</strong>
            <span>уроков в пути новичка</span>
          </div>
          <div className="hero-meta-card">
            <strong>3</strong>
            <span>мини-игры с живыми бросками</span>
          </div>
          <div className="hero-meta-card">
            <strong>{Math.max(progressPercent, achievementsCount)}</strong>
            <span>прогресс и награды уже сохраняются</span>
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
              Бой
            </motion.div>
            <motion.div animate={{ y: [0, -10, 0] }} className="hero-card hero-card-2" transition={{ duration: 5.2, ease: 'easeInOut', repeat: Infinity }}>
              d20
            </motion.div>
            <motion.div animate={{ y: [0, -7, 0] }} className="hero-card hero-card-3" transition={{ duration: 4.2, ease: 'easeInOut', repeat: Infinity }}>
              Классы
            </motion.div>
          </div>

          <div className="hero-note">
            <strong>Живая академия</strong>
            <span>Уроки открываются по пути, дают XP и подкрепляются интерактивными сценами.</span>
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
          <span className="section-kicker">Прогресс ученика</span>
          <h2 className="section-title">Панель академии</h2>
          <p className="section-subtitle">Мягкая геймификация в духе Duolingo, но в атмосфере фэнтези-школы.</p>
        </div>
      </div>

      <div className="xp-shell">
        <div className="xp-labels">
          <span>XP в уровне: {xpIntoLevel} / 180</span>
          <strong>{progressPercent}%</strong>
        </div>
        <div className="xp-track">
          <div className="xp-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <small>До следующего уровня осталось {xpToNext} XP</small>
      </div>

      <div className="progress-stat-grid">
        <article className="progress-stat">
          <span>Уровень</span>
          <strong className="progress-number">{level}</strong>
        </article>
        <article className="progress-stat">
          <span>Пройдено</span>
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
        <span>Продолжить с темы</span>
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
              <strong>Первые достижения ждут</strong>
              <small>Заверши урок или мини-игру, чтобы открыть первый badge.</small>
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
          <span className="section-kicker">Путь обучения</span>
          <h2 className="section-title">Карта академии</h2>
          <p className="section-subtitle">Уроки открываются последовательно, как на карте приключения.</p>
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
                  {completed ? 'Освоен' : current ? 'Текущий урок' : locked ? 'Закрыт' : 'Открыт'}
                </span>
              </button>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

function LessonStage({
  completedSet,
  lesson,
  newbieMode,
  onCompleteLesson,
  onJumpToTrials,
  soundEnabled,
}) {
  const [selectedOptionId, setSelectedOptionId] = useState(null)
  const [practiceComplete, setPracticeComplete] = useState(false)
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

  const isCompleted = completedSet.has(lesson.id)
  const selectedQuizOption = lesson.quiz.options.find((option) => option.id === selectedOptionId)
  const modifierValue = Math.floor((modifierScore - 10) / 2)
  const selectedSpell = SPELL_OPTIONS.find((spell) => spell.id === selectedSpellId) ?? SPELL_OPTIONS[0]
  const canFinish = isCompleted || selectedQuizOption?.correct || practiceComplete

  useEffect(() => {
    setSelectedOptionId(null)
    setPracticeComplete(isCompleted)
    setDoorChoice(null)
    setAbilityIndex(0)
    setAbilityFeedback('')
    setModifierScore(14)
    setArmorResult(null)
    setDamageState({ attack: null, damage: null, hit: false })
    setSelectedSpellId(SPELL_OPTIONS[0].id)
    setFlowAvailable(shuffle(FLOW_STEPS))
    setFlowBuilt([])
    setFlowFeedback('')
  }, [isCompleted, lesson.id])

  const answerQuiz = (optionId) => {
    setSelectedOptionId(optionId)
    const option = lesson.quiz.options.find((item) => item.id === optionId)
    playArcaneCue(soundEnabled, option?.correct ? 'success' : 'fail')
  }

  return (
    <section className="panel lesson-stage">
      <div className="lesson-topline">
        <span className="section-kicker">{lesson.chapter}</span>
        <span className="result-pill">+{lesson.xp} XP</span>
      </div>

      <div className="lesson-grid">
        <div className="lesson-copy">
          <div className="lesson-heading">
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
            <button className="btn-secondary" onClick={() => setPracticeComplete(false)} type="button">
              Попробовать самому
            </button>
            <button
              className="btn-primary"
              disabled={!canFinish}
              onClick={() => onCompleteLesson(lesson.id)}
              type="button"
            >
              {isCompleted
                ? 'Повторить и перейти дальше'
                : canFinish
                  ? 'Урок освоен'
                  : 'Сначала пройди мини-проверку'}
            </button>
            {lesson.practiceType === 'adventure' && (
              <button className="ghost-button" onClick={onJumpToTrials} type="button">
                Открыть полигон
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
            <span className="section-kicker">Практика</span>
            <h3 className="section-title">Попробовать самому</h3>
          </div>
        </div>

        {lesson.practiceType === 'door-choice' && (
          <div className="practice-grid">
            <div className="choice-grid">
              {doorChoices.map((choice) => (
                <button
                  className="choice-button"
                  key={choice.id}
                  onClick={() => {
                    setDoorChoice(choice.id)
                    setPracticeComplete(true)
                    playArcaneCue(soundEnabled, 'roll')
                  }}
                  type="button"
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <div className="practice-outcome">
              <strong>Свобода выбора за столом</strong>
              <p>
                {doorChoice
                  ? doorChoices.find((choice) => choice.id === doorChoice)?.result
                  : 'Выбери любой подход. D&D ценит инициативу, а не один правильный ответ.'}
              </p>
            </div>
          </div>
        )}

        {lesson.practiceType === 'dice' && (
          <DiceRoller
            onMilestone={() => setPracticeComplete(true)}
            soundEnabled={soundEnabled}
          />
        )}

        {lesson.practiceType === 'skill-check' && (
          <SkillCheckDemo
            onResolve={() => setPracticeComplete(true)}
            soundEnabled={soundEnabled}
          />
        )}

        {lesson.practiceType === 'abilities' && (
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
                        ? 'Точно. Эта характеристика ощущается наиболее естественно.'
                        : 'Почти. Подумай, какой талант здесь нужен в первую очередь.',
                    )
                    playArcaneCue(soundEnabled, correct ? 'success' : 'fail')
                    if (correct && abilityIndex < ABILITY_MATCH_CHALLENGES.length - 1) {
                      setAbilityIndex((previous) => previous + 1)
                    }
                    if (correct && abilityIndex === ABILITY_MATCH_CHALLENGES.length - 1) {
                      setPracticeComplete(true)
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

        {lesson.practiceType === 'modifiers' && (
          <div className="modifier-panel">
            <label htmlFor="modifier-score">Подвигай характеристику героя</label>
            <input
              id="modifier-score"
              max="18"
              min="8"
              onChange={(event) => {
                setModifierScore(Number(event.target.value))
                setPracticeComplete(true)
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

        {lesson.practiceType === 'classes' && (
          <ClassCards onSelect={() => setPracticeComplete(true)} />
        )}

        {lesson.practiceType === 'combat' && (
          <CombatDemo onVictory={() => setPracticeComplete(true)} soundEnabled={soundEnabled} title="Тренировочный бой" />
        )}

        {lesson.practiceType === 'armor-class' && (
          <div className="armor-demo">
            <strong>Цель: гоблин с AC {armorDc}</strong>
            <button
              className="btn-secondary"
              onClick={() => {
                const attack = rollDie(20) + 4
                const success = attack >= armorDc
                setArmorResult({ attack, success })
                setPracticeComplete(true)
                playArcaneCue(soundEnabled, success ? 'success' : 'fail')
              }}
              type="button"
            >
              Бросить атаку
            </button>
            {armorResult && (
              <div className={`quiz-feedback ${armorResult.success ? 'success' : 'fail'}`}>
                Атака = {armorResult.attack}.{' '}
                {armorResult.success ? 'Попадание прошло через защиту.' : 'Щит выдержал удар.'}
              </div>
            )}
          </div>
        )}

        {lesson.practiceType === 'damage' && (
          <div className="damage-demo">
            <button
              className="btn-secondary"
              onClick={() => {
                const attack = rollDie(20) + 5
                const hit = attack >= armorDc
                setDamageState({ attack, damage: null, hit })
                setPracticeComplete(true)
                playArcaneCue(soundEnabled, hit ? 'success' : 'fail')
              }}
              type="button"
            >
              Шаг 1: проверить попадание
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
              Шаг 2: бросить урон
            </button>
            <div className="damage-result">
              <span>Атака: {damageState.attack ?? '--'}</span>
              <span>{damageState.hit ? 'Попал' : damageState.attack ? 'Промах' : 'Ждёт броска'}</span>
              <strong>Урон: {damageState.damage ?? '--'}</strong>
            </div>
          </div>
        )}

        {lesson.practiceType === 'spells' && (
          <div className="practice-grid">
            <div className="spell-button-row">
              {SPELL_OPTIONS.map((spell) => (
                <button
                  className={`spell-button ${selectedSpellId === spell.id ? 'is-selected' : ''}`}
                  key={spell.id}
                  onClick={() => {
                    setSelectedSpellId(spell.id)
                    setPracticeComplete(true)
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

        {lesson.practiceType === 'flow' && (
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
                      setFlowFeedback('Отлично. Цепочка движется дальше.')
                      if (nextBuilt.length === FLOW_STEPS.length) {
                        setPracticeComplete(true)
                        playArcaneCue(soundEnabled, 'success')
                      } else {
                        playArcaneCue(soundEnabled, 'roll')
                      }
                    } else {
                      setFlowFeedback('Попробуй начать с описания мастера.')
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
                : 'Собери правильный порядок хода сцены'}
            </div>
            {flowFeedback && <div className="practice-feedback success">{flowFeedback}</div>}
          </div>
        )}

        {lesson.practiceType === 'adventure' && (
          <div className="adventure-callout">
            <strong>Открой тренировочный полигон</strong>
            <p>Ниже тебя ждут три мини-сцены: сундук, стражник и первый бой.</p>
            <button className="btn-secondary" onClick={onJumpToTrials} type="button">
              Перейти к мини-приключению
            </button>
          </div>
        )}

        {lesson.practiceType === 'final-exam' && (
          <FinalExam onComplete={() => setPracticeComplete(true)} soundEnabled={soundEnabled} />
        )}
      </div>

      <div className="quiz-shell">
        <span className="section-kicker">Мини-проверка</span>
        <h3 className="quiz-question">{lesson.quiz.question}</h3>
        <div className="quiz-grid">
          {lesson.quiz.options.map((option) => (
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
    </section>
  )
}

function AnimatedExamplePanel({ lesson }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setPhase((previous) => previous + 1), 1800)
    return () => window.clearInterval(timer)
  }, [])

  const tags = ['лес', 'сундук', 'таверна', 'дракон']
  const dice = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20']
  const selectedDie = phase % dice.length
  const spellState = SPELL_OPTIONS[phase % SPELL_OPTIONS.length]

  return (
    <aside className={`panel example-panel accent-${lesson.accent}`}>
      <span className="example-badge">Анимационный пример</span>
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
              Мастер: &quot;Вдалеке слышен рык...&quot;
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
              <span>+ Ловкость 2</span>
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
              {['8 → -1', '10 → 0', '14 → +2', '16 → +3'].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        )}

        {lesson.exampleType === 'classes' && (
          <div className="scene-class-stack">
            {['Воин', 'Маг', 'Разбойник', 'Бард'].map((item, index) => (
              <motion.div animate={{ opacity: phase % 4 === index ? 1 : 0.46, y: phase % 4 === index ? -4 : 0 }} className={`scene-class-card ${phase % 4 === index ? 'is-featured' : ''}`} key={item}>
                <span>{item}</span>
                <small>{phase % 4 === index ? 'Текущий архетип' : 'Класс'}</small>
              </motion.div>
            ))}
          </div>
        )}

        {lesson.exampleType === 'combat' && (
          <div className="scene-combat-strip">
            <div className="scene-avatar hero">Герой</div>
            <motion.div animate={{ opacity: [0.2, 1, 0.2], scaleX: [0.5, 1, 0.5] }} className="scene-slash" transition={{ duration: 1.8, repeat: Infinity }} />
            <div className="scene-avatar goblin">Гоблин</div>
            <div className="scene-combat-hud">
              <span>Атака {phase % 2 === 0 ? 16 : 9}</span>
              <span>{phase % 2 === 0 ? 'Попадание' : 'Промах'}</span>
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
            {['Описание', 'Выбор', 'Бросок', 'Последствие'].map((label, index) => (
              <motion.div animate={{ opacity: phase % 4 === index ? 1 : 0.45, scale: phase % 4 === index ? 1.05 : 1 }} className="scene-flow-node" key={label}>
                {label}
              </motion.div>
            ))}
          </div>
        )}

        {lesson.exampleType === 'adventure' && (
          <div className="scene-map-board">
            <div className="scene-map-path" />
            {['Сундук', 'Стражник', 'Гоблин'].map((node, index) => (
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
      ? 'Выбери кубик и брось его в зону.'
      : selectedDie === 20 && result === 20
        ? 'Критический успех. Золотая вспышка заслужена.'
        : selectedDie === 20 && result === 1
          ? 'Натуральная единица. Отличный повод для драматичного провала.'
          : result >= Math.ceil(selectedDie * 0.75)
            ? 'Сильный результат. Такой бросок приятно слышать за столом.'
            : result <= Math.ceil(selectedDie * 0.25)
              ? 'Низкий результат. Здесь рождаются интересные последствия.'
              : 'Нормальный бросок. В D&D важен не только результат, но и контекст.'

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
          <span className="result-pill">Проверочная цель</span>
          <strong>Чаще всего для проверок нужен d20</strong>
          <p>
            {selectedDie === 20
              ? 'Этот кубик чаще всего отвечает на вопрос: “Удалось ли?”'
              : `d${selectedDie} чаще помогает урону, лечению или эффектам.`}
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
          <span>Ты выбросил</span>
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
        <strong>Перелезть через стену крепости</strong>
        <p>Нажми на бросок и посмотри, как формула собирается прямо на глазах.</p>
      </div>
      <div className="check-row">
        <span>d20</span>
        <span>+</span>
        <span>бонус +2</span>
        <span>=</span>
        <strong>{result ? result.total : '--'}</strong>
      </div>
      <div className="check-stat-line">
        <span>Сложность сцены: DC 14</span>
        <span>{result ? (result.success ? 'Успех' : 'Пока не вышло') : 'Ожидание'}</span>
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
          Бросить самому
        </button>
        {result && (
          <span className={`practice-feedback ${result.success ? 'success' : 'fail'}`}>
            d20 = {result.roll}, итог = {result.total}
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
        <strong>Тебе может подойти: {selectedClass.name}</strong>
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
  log: ['Брось инициативу, чтобы начать бой.'],
  playerHp: 18,
  started: false,
  turn: 'setup',
}

function CombatDemo({ onVictory, soundEnabled, title = 'Первый бой' }) {
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
            ? `Гоблин попадает на ${attackRoll} и наносит ${damage} урона.`
            : `Гоблин бьёт на ${attackRoll}, но ты выдерживаешь натиск.`,
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
        `Инициатива: ты ${playerInitiative}, гоблин ${enemyInitiative}. ${
          playerStarts ? 'Твой ход.' : 'Гоблин успевает первым.'
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
              ? `Ты попадаешь на ${attackRoll} и снимаешь ${damage} HP.`
              : `Ты атакуешь на ${attackRoll}, но гоблин уворачивается.`,
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
          log: addLog('Ты поднимаешь защиту и готовишься к ответному удару.', previous.log),
          turn: 'enemy',
        }
      }

      playArcaneCue(soundEnabled, 'roll')
      return {
        ...previous,
        log: addLog('Ты отступаешь на шаг и выигрываешь короткую передышку.', previous.log),
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
          <span className="section-kicker">Боевая практика</span>
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
          Сбросить
        </button>
      </div>

      <div className="combat-health">
        <div>
          <span>Герой</span>
          <div className="health-track">
            <div className="health-fill player" style={{ width: playerPercent }} />
          </div>
          <small>{state.playerHp} HP</small>
        </div>
        <div>
          <span>Гоблин</span>
          <div className="health-track">
            <div className="health-fill enemy" style={{ width: enemyPercent }} />
          </div>
          <small>{state.enemyHp} HP</small>
        </div>
      </div>

      <div className="combat-body">
        <div className="combat-avatar hero">Ты</div>
        <div className="combat-avatar goblin">Гоблин</div>
      </div>

      <div className="combat-actions">
        {!state.started ? (
          <button className="btn-secondary" onClick={startFight} type="button">
            Бросить инициативу
          </button>
        ) : (
          <>
            <button className="tiny-button" onClick={() => takeAction('attack')} type="button">
              Атаковать
            </button>
            <button className="tiny-button" onClick={() => takeAction('guard')} type="button">
              Защититься
            </button>
            <button className="tiny-button" onClick={() => takeAction('retreat')} type="button">
              Отойти
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
      <span className="section-kicker">Мини-игра</span>
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
              <span>Итог: {result.total}</span>
            </div>
            <p>{result.message}</p>
          </>
        ) : (
          <p>Выбери подход и посмотри, как кубик, бонус и сцена собираются в одно приключение.</p>
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

  if (passed && !completionRef.current) {
    completionRef.current = true
    onComplete?.(true)
    playArcaneCue(soundEnabled, 'achievement')
  }

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
          Результат: {score} / {FINAL_EXAM_QUESTIONS.length}.{' '}
          {passed
            ? 'Ты готов к первой настоящей сессии.'
            : 'Ничего страшного: попробуй ещё раз или вернись к урокам.'}
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
                <span className="section-kicker">Под рукой</span>
                <h3 className="section-title">Словарь и быстрый справочник</h3>
              </div>
              <button className="tiny-button" onClick={onClose} type="button">
                Закрыть
              </button>
            </div>

            <div className="drawer-tabs">
              <button className={`drawer-tab ${activeTab === 'glossary' ? 'is-active' : ''}`} onClick={() => setActiveTab('glossary')} type="button">
                Словарь
              </button>
              <button className={`drawer-tab ${activeTab === 'reference' ? 'is-active' : ''}`} onClick={() => setActiveTab('reference')} type="button">
                Быстрый справочник
              </button>
            </div>

            {activeTab === 'glossary' && (
              <>
                <input
                  className="drawer-search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Искать термин..."
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
            <span>Новое достижение</span>
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
    { step: 'I', text: 'Ты никогда не играл в D&D? Это нормально.' },
    { step: 'II', text: 'Здесь ты учишься через короткие уроки, визуальные сцены и интерактив.' },
    { step: 'III', text: 'Начнём с самого простого — что вообще происходит в игре.' },
  ]

  return (
    <div className="onboarding-overlay">
      <motion.div animate={{ opacity: 1, scale: 1 }} className="onboarding-panel" initial={{ opacity: 0, scale: 0.94 }}>
        <span className="section-kicker">Первый вход</span>
        <h3 className="section-title">Добро пожаловать в академию</h3>
        <div className="onboarding-grid">
          {cards.map((card) => (
            <article className="onboarding-card" key={card.step}>
              <span className="onboarding-card-step">{card.step}</span>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
        <button className="btn-primary" onClick={onEnter} type="button">
          Войти в академию
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
            Фэнтезийный курс для новичков: короткие уроки, анимированные примеры, мягкая геймификация и первый безопасный вход в мир D&amp;D.
          </p>
        </div>
        <div>
          <strong>Что уже есть</strong>
          <p className="footer-note">
            Hero, onboarding, карта обучения, прогресс, мини-игры, словарь, localStorage и подготовка к деплою на GitHub Pages.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default App
