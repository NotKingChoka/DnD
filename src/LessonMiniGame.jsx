import { useEffect, useMemo, useRef, useState } from 'react'
import { CLASS_OPTIONS, SPELL_OPTIONS } from './courseData'
import { playArcaneCue, rollDie } from './utils'

const DND_SEQUENCE_OPTIONS = [
  { id: 'dm', label: 'Мастер описывает мир', note: 'Он задаёт сцену и атмосферу.' },
  { id: 'player', label: 'Игрок выбирает действие', note: 'Герой делает осознанный ход.' },
  { id: 'dice', label: 'Кубик решает риск', note: 'Бросок нужен, когда исход неочевиден.' },
  { id: 'result', label: 'История движется дальше', note: 'Мир отвечает последствиями.' },
]

const ROLE_ASSIGNMENT_CARDS = [
  { id: 'describe', text: '«Перед вами запертая дверь в древних руинах.»', answer: 'dm' },
  { id: 'choice', text: '«Я осматриваю замок и петли.»', answer: 'player' },
  { id: 'check', text: '«Брось d20 и прибавь ловкость.»', answer: 'roll' },
  { id: 'result', text: '«С результатом 16 ловушка замечена.»', answer: 'roll' },
]

const ROLE_OPTIONS = [
  { id: 'dm', label: 'Мастер' },
  { id: 'player', label: 'Игрок' },
  { id: 'roll', label: 'Проверка' },
]

const DICE_ALTAR_ROUNDS = [
  {
    id: 'trap',
    prompt: 'Проверка: заметил ли ты ловушку у двери?',
    answer: 'd20',
    options: ['d4', 'd6', 'd20'],
    success: 'Проверки успеха чаще всего крутятся вокруг d20.',
  },
  {
    id: 'sword',
    prompt: 'Урон от короткого меча по гоблину.',
    answer: 'd6',
    options: ['d6', 'd12', 'd20'],
    success: 'Небольшое оружие часто использует d6 для урона.',
  },
  {
    id: 'iconic',
    prompt: 'Самый узнаваемый кубик D&D на гербе академии.',
    answer: 'd20',
    options: ['d8', 'd20', 'd10'],
    success: 'Именно d20 чаще всего ассоциируется с D&D.',
  },
]

const SKILL_PATH_CHECKS = [
  { id: 'jump', prompt: 'Перепрыгнуть трещину в полу храма', bonus: 2, dc: 13, stat: 'Ловкость' },
  { id: 'hide', prompt: 'Спрятаться за колонной до патруля', bonus: 3, dc: 14, stat: 'Ловкость' },
  { id: 'tracks', prompt: 'Заметить свежие следы на пыли', bonus: 1, dc: 12, stat: 'Мудрость' },
  { id: 'lock', prompt: 'Открыть древний замок без шума', bonus: 4, dc: 15, stat: 'Ловкость' },
]

const ABILITY_SCENES = [
  {
    id: 'stone',
    prompt: 'Поднять тяжёлый камень у входа',
    answer: 'Сила',
    options: ['Сила', 'Ловкость', 'Харизма', 'Интеллект', 'Мудрость', 'Телосложение'],
    success: 'Сила отвечает за грубую мощь и давление.',
  },
  {
    id: 'guard',
    prompt: 'Убедить стражника дать вам минуту',
    answer: 'Харизма',
    options: ['Сила', 'Ловкость', 'Харизма', 'Интеллект', 'Мудрость', 'Телосложение'],
    success: 'Харизма помогает влиять, убеждать и вести диалог.',
  },
  {
    id: 'forest',
    prompt: 'Заметить шорох в тёмном лесу',
    answer: 'Мудрость',
    options: ['Сила', 'Ловкость', 'Харизма', 'Интеллект', 'Мудрость', 'Телосложение'],
    success: 'Мудрость чувствует детали, интуицию и внимание.',
  },
  {
    id: 'symbol',
    prompt: 'Вспомнить древний символ на арке',
    answer: 'Интеллект',
    options: ['Сила', 'Ловкость', 'Харизма', 'Интеллект', 'Мудрость', 'Телосложение'],
    success: 'Интеллект связан со знаниями и памятью.',
  },
  {
    id: 'jump-2',
    prompt: 'Перепрыгнуть рухнувшую балку',
    answer: 'Ловкость',
    options: ['Сила', 'Ловкость', 'Харизма', 'Интеллект', 'Мудрость', 'Телосложение'],
    success: 'Ловкость ведёт координацию, баланс и быстрые движения.',
  },
]

const MODIFIER_FORGE_ROUNDS = [
  { id: 'door', roll: 12, bonus: 3, answer: 15, options: [14, 15, 16], prompt: 'Дверь откроется при 15 или выше.' },
  { id: 'trap', roll: 9, bonus: 4, answer: 13, options: [12, 13, 14], prompt: 'Нужно успеть заметить ловушку.' },
  { id: 'jump', roll: 16, bonus: 2, answer: 18, options: [18, 19, 20], prompt: 'Герой прыгает через пролом.' },
]

function useResolveOnce(completed, onResolve) {
  const resolvedRef = useRef(completed)

  useEffect(() => {
    if (completed) {
      resolvedRef.current = true
    }
  }, [completed])

  return (payload = {}) => {
    if (resolvedRef.current) {
      return
    }

    resolvedRef.current = true
    onResolve?.(payload)
  }
}

function MiniGameScaffold({ children, completed, miniGame, onReplay }) {
  return (
    <section className={`lesson-section mini-game-shell type-${miniGame.type}`}>
      <div className="lesson-section-head mini-game-head">
        <div>
          <span className="section-kicker">Испытание приключенца</span>
          <h3 className="section-title">{miniGame.title}</h3>
          <p className="section-subtitle">{miniGame.intro}</p>
        </div>
        <div className="mini-game-status">
          <span className="result-pill">+{miniGame.xp} XP</span>
          <button className="ghost-button" onClick={onReplay} type="button">
            Переиграть
          </button>
        </div>
      </div>

      {completed && <div className="mini-game-feedback success is-persistent">{miniGame.rewardText}</div>}
      {children}
    </section>
  )
}

function SequenceMiniGame({ completed, onResolve, soundEnabled, targetOrder }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [sequence, setSequence] = useState([])
  const [feedback, setFeedback] = useState('')

  const choose = (stepId) => {
    if (sequence.includes(stepId)) {
      return
    }

    const nextSequence = [...sequence, stepId]
    setSequence(nextSequence)

    if (nextSequence.length < targetOrder.length) {
      playArcaneCue(soundEnabled, 'roll')
      return
    }

    const success = nextSequence.every((id, index) => id === targetOrder[index])
    setFeedback(
      success
        ? 'Цепочка сложилась правильно. Именно так сцена оживает в D&D.'
        : 'Порядок сбился. Сначала мир описывают, потом герой действует, и только затем кубик решает риск.',
    )
    playArcaneCue(soundEnabled, success ? 'success' : 'fail')

    if (success) {
      finishOnce()
    } else {
      setSequence([])
    }
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-slots">
        {Array.from({ length: targetOrder.length }, (_, index) => {
          const selected = DND_SEQUENCE_OPTIONS.find((item) => item.id === sequence[index])

          return (
            <div className="mini-game-slot" key={index}>
              <strong>{index + 1}</strong>
              <span>{selected?.label ?? 'Пустой шаг'}</span>
            </div>
          )
        })}
      </div>

      <div className="mini-game-option-grid">
        {DND_SEQUENCE_OPTIONS.map((option) => (
          <button
            className={`choice-button ${sequence.includes(option.id) ? 'is-selected' : ''}`}
            disabled={sequence.includes(option.id)}
            key={option.id}
            onClick={() => choose(option.id)}
            type="button"
          >
            <strong>{option.label}</strong>
            <span>{option.note}</span>
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mini-game-feedback ${feedback.startsWith('Цепочка') ? 'success' : 'fail'}`}>
          {feedback}
        </div>
      )}
    </div>
  )
}

function RoleAssignmentMiniGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [answers, setAnswers] = useState({})
  const [feedback, setFeedback] = useState('')

  const allAssigned = ROLE_ASSIGNMENT_CARDS.every((card) => answers[card.id])

  const checkAssignments = () => {
    if (!allAssigned) {
      setFeedback('Сначала распредели все карточки по ролям.')
      playArcaneCue(soundEnabled, 'fail')
      return
    }

    const success = ROLE_ASSIGNMENT_CARDS.every((card) => answers[card.id] === card.answer)
    setFeedback(
      success
        ? 'Верно. Мастер описывает, игрок решает, а проверка показывает риск и итог.'
        : 'Почти. Посмотри, кто говорит о мире, кто говорит за героя и где включается проверка.',
    )
    playArcaneCue(soundEnabled, success ? 'success' : 'fail')

    if (success) {
      finishOnce()
    }
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-role-grid">
        {ROLE_ASSIGNMENT_CARDS.map((card) => (
          <article className="mini-game-role-card" key={card.id}>
            <strong>{card.text}</strong>
            <div className="mini-game-role-actions">
              {ROLE_OPTIONS.map((role) => (
                <button
                  className={`tiny-button ${answers[card.id] === role.id ? 'is-selected' : ''}`}
                  key={role.id}
                  onClick={() => setAnswers((previous) => ({ ...previous, [card.id]: role.id }))}
                  type="button"
                >
                  {role.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <button className="btn-secondary" onClick={checkAssignments} type="button">
        Проверить роли
      </button>

      {feedback && (
        <div className={`mini-game-feedback ${feedback.startsWith('Верно') ? 'success' : 'fail'}`}>
          {feedback}
        </div>
      )}
    </div>
  )
}

function DiceAltarMiniGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [roundIndex, setRoundIndex] = useState(0)
  const [feedback, setFeedback] = useState('')
  const round = DICE_ALTAR_ROUNDS[roundIndex]

  const choose = (die) => {
    const success = die === round.answer
    setFeedback(success ? round.success : 'Этот кубик здесь не лучший выбор. Подумай о роли сцены.')
    playArcaneCue(soundEnabled, success ? 'success' : 'fail')

    if (!success) {
      return
    }

    if (roundIndex === DICE_ALTAR_ROUNDS.length - 1) {
      finishOnce()
      return
    }

    setRoundIndex((previous) => previous + 1)
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-board">
        <strong>{round.prompt}</strong>
        <small>
          Сцена {roundIndex + 1} / {DICE_ALTAR_ROUNDS.length}
        </small>
      </div>

      <div className="mini-game-dice-grid">
        {round.options.map((die) => (
          <button className="dice-chip" key={die} onClick={() => choose(die)} type="button">
            {die}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mini-game-feedback ${feedback === round.success ? 'success' : 'fail'}`}>
          {feedback}
        </div>
      )}
    </div>
  )
}

function SkillPathMiniGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [roundIndex, setRoundIndex] = useState(0)
  const [results, setResults] = useState([])
  const round = SKILL_PATH_CHECKS[roundIndex]

  const rollCheck = () => {
    const roll = rollDie(20)
    const total = roll + round.bonus
    const success = total >= round.dc
    const nextResults = [...results, { ...round, roll, total, success }]
    setResults(nextResults)
    playArcaneCue(soundEnabled, success ? 'success' : 'roll')

    if (roundIndex === SKILL_PATH_CHECKS.length - 1) {
      finishOnce({
        rewardText:
          'Ты прошёл несколько проверок подряд и увидел, как даже неудача двигает сцену дальше.',
      })
      return
    }

    setRoundIndex((previous) => previous + 1)
  }

  const latest = results.at(-1)

  return (
    <div className="mini-game-stage">
      <div className="mini-game-board">
        <strong>{round.prompt}</strong>
        <div className="mini-game-equation">
          <span>Бонус: +{round.bonus}</span>
          <span>{round.stat}</span>
          <span>DC {round.dc}</span>
        </div>
      </div>

      <button className="btn-secondary" onClick={rollCheck} type="button">
        Бросить d20
      </button>

      {latest && latest.id === round.id && (
        <div className={`mini-game-feedback ${latest.success ? 'success' : 'fail'}`}>
          d20 = {latest.roll}, итог = {latest.total}.{' '}
          {latest.success ? 'Проверка пройдена.' : 'Проверка не удалась, но сцена всё равно движется.'}
        </div>
      )}

      <div className="mini-game-log">
        {results.map((result) => (
          <div className="mini-game-log-line" key={result.id}>
            <span>{result.prompt}</span>
            <strong>{result.total}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function AbilityScenesMiniGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [roundIndex, setRoundIndex] = useState(0)
  const [feedback, setFeedback] = useState('')
  const round = ABILITY_SCENES[roundIndex]

  const choose = (ability) => {
    const success = ability === round.answer
    setFeedback(success ? round.success : 'Не совсем. Подумай, какой талант здесь помогает в первую очередь.')
    playArcaneCue(soundEnabled, success ? 'success' : 'fail')

    if (!success) {
      return
    }

    if (roundIndex === ABILITY_SCENES.length - 1) {
      finishOnce()
      return
    }

    setRoundIndex((previous) => previous + 1)
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-board">
        <strong>{round.prompt}</strong>
        <small>
          Сцена {roundIndex + 1} / {ABILITY_SCENES.length}
        </small>
      </div>

      <div className="mini-game-option-grid six-col">
        {round.options.map((option) => (
          <button className="choice-button" key={option} onClick={() => choose(option)} type="button">
            {option}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mini-game-feedback ${feedback === round.success ? 'success' : 'fail'}`}>
          {feedback}
        </div>
      )}
    </div>
  )
}

const CLASS_SCENARIOS = [
  {
    id: 'frontline',
    prompt: 'Удержать фронт против напора врага',
    answer: 'fighter',
    options: ['fighter', 'rogue', 'wizard', 'bard'],
    success: 'Воин ставит щит и спокойно держит линию.',
  },
  {
    id: 'shadow',
    prompt: 'Тихо пробраться мимо дозорного',
    answer: 'rogue',
    options: ['paladin', 'rogue', 'cleric', 'barbarian'],
    success: 'Разбойник исчезает в тени и проходит бесшумно.',
  },
  {
    id: 'heal',
    prompt: 'Поднять раненого союзника светом',
    answer: 'cleric',
    options: ['fighter', 'cleric', 'wizard', 'ranger'],
    success: 'Клирик накрывает союзника тёплым золотым сиянием.',
  },
  {
    id: 'arcane',
    prompt: 'Поразить врага магическим зарядом издалека',
    answer: 'wizard',
    options: ['wizard', 'bard', 'fighter', 'paladin'],
    success: 'Маг выпускает чёткий луч силы с безопасной дистанции.',
  },
  {
    id: 'support',
    prompt: 'Поддержать команду речью и музыкой',
    answer: 'bard',
    options: ['bard', 'barbarian', 'paladin', 'ranger'],
    success: 'Бард поднимает дух отряда и меняет ритм сцены.',
  },
]

const AC_ARENA_TARGETS = [
  { id: 'goblin', name: 'Гоблин', ac: 12, bonus: 4, flavor: 'Небольшой и юркий.' },
  { id: 'skeleton', name: 'Скелет', ac: 14, bonus: 4, flavor: 'Старый, но крепкий.' },
  { id: 'knight', name: 'Рыцарь', ac: 18, bonus: 4, flavor: 'Тяжёлая броня и щит.' },
]

const DAMAGE_FORGE_WEAPONS = [
  { id: 'dagger', name: 'Кинжал', die: 4, hp: 5, attackBonus: 5, attackDc: 11 },
  { id: 'sword', name: 'Меч', die: 8, hp: 8, attackBonus: 5, attackDc: 12 },
  { id: 'hammer', name: 'Молот', die: 10, hp: 10, attackBonus: 5, attackDc: 13 },
]

const LIGHT_SPELL = {
  id: 'light',
  name: 'Light',
  description: 'Небольшой источник света.',
  effect: 'Сфера мягкого света раскрывает тёмные углы и символы.',
}

const SPELL_SCENES = [
  {
    id: 'ally',
    prompt: 'Союзник ранен и едва держится на ногах.',
    answer: 'heal',
    success: 'Тёплый свет затягивает раны и возвращает силы.',
  },
  {
    id: 'far',
    prompt: 'Враг стоит далеко на каменном мосту.',
    answer: 'fire-bolt',
    success: 'Огненный луч летит точно в цель через весь пролёт.',
  },
  {
    id: 'defense',
    prompt: 'На тебя уже несётся удар копья.',
    answer: 'shield',
    success: 'Прозрачный барьер вспыхивает и гасит импульс удара.',
  },
  {
    id: 'dark',
    prompt: 'Тёмный коридор скрывает руны и трещины.',
    answer: 'light',
    success: 'Мягкое сияние заливает коридор и открывает детали.',
  },
]

const TAVERN_APPROACHES = [
  { id: 'observe', label: 'Наблюдать издалека', bonus: 2, dc: 12, stat: 'Мудрость' },
  { id: 'talk', label: 'Подойти и заговорить', bonus: 3, dc: 13, stat: 'Харизма' },
  { id: 'watch', label: 'Сесть рядом и прислушаться', bonus: 1, dc: 11, stat: 'Мудрость' },
  { id: 'ignore', label: 'Сделать вид, что не заметил', bonus: 0, dc: 10, stat: 'Хладнокровие' },
]

function ModifierForgeMiniGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [roundIndex, setRoundIndex] = useState(0)
  const [feedback, setFeedback] = useState('')
  const round = MODIFIER_FORGE_ROUNDS[roundIndex]

  const choose = (answer) => {
    const success = answer === round.answer
    setFeedback(
      success
        ? `Верно. ${round.roll} + ${round.bonus} = ${round.answer}.`
        : 'Почти. Сложи d20 и бонус ещё раз.',
    )
    playArcaneCue(soundEnabled, success ? 'success' : 'fail')

    if (!success) {
      return
    }

    if (roundIndex === MODIFIER_FORGE_ROUNDS.length - 1) {
      finishOnce()
      return
    }

    setRoundIndex((previous) => previous + 1)
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-board">
        <strong>{round.prompt}</strong>
        <div className="mini-game-equation">
          <span>d20 = {round.roll}</span>
          <span>Бонус = +{round.bonus}</span>
          <span>Итог = ?</span>
        </div>
      </div>

      <div className="mini-game-option-grid">
        {round.options.map((option) => (
          <button className="answer-button" key={option} onClick={() => choose(option)} type="button">
            {option}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mini-game-feedback ${feedback.startsWith('Верно') ? 'success' : 'fail'}`}>
          {feedback}
        </div>
      )}
    </div>
  )
}

function ClassScenarioMiniGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [roundIndex, setRoundIndex] = useState(0)
  const [selectedClassId, setSelectedClassId] = useState(null)
  const [feedback, setFeedback] = useState('')
  const round = CLASS_SCENARIOS[roundIndex]
  const displayedClasses = round.options.map(
    (id) => CLASS_OPTIONS.find((option) => option.id === id) ?? { id, name: id, summary: '' },
  )
  const selectedClass = displayedClasses.find((item) => item.id === selectedClassId)

  const choose = (classId) => {
    const success = classId === round.answer
    setSelectedClassId(classId)
    setFeedback(success ? round.success : 'Этот класс тоже интересен, но сцене нужен другой набор сильных сторон.')
    playArcaneCue(soundEnabled, success ? 'success' : 'fail')

    if (!success) {
      return
    }

    if (roundIndex === CLASS_SCENARIOS.length - 1) {
      finishOnce()
      return
    }

    window.setTimeout(() => {
      setRoundIndex((previous) => previous + 1)
      setSelectedClassId(null)
      setFeedback('')
    }, 700)
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-board">
        <strong>{round.prompt}</strong>
        <small>Выбери класс, который лучше всего подходит к ситуации.</small>
      </div>

      <div className="mini-game-option-grid">
        {displayedClasses.map((option) => (
          <button
            className={`choice-button ${selectedClassId === option.id ? 'is-selected' : ''}`}
            key={option.id}
            onClick={() => choose(option.id)}
            type="button"
          >
            <strong>{option.name}</strong>
            <span>{option.summary}</span>
          </button>
        ))}
      </div>

      {selectedClass && (
        <div className="mini-game-preview-card">
          <strong>{selectedClass.name}</strong>
          <p>{selectedClass.focus}</p>
        </div>
      )}

      {feedback && (
        <div className={`mini-game-feedback ${feedback === round.success ? 'success' : 'fail'}`}>
          {feedback}
        </div>
      )}
    </div>
  )
}

function CombatTutorialMiniGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [state, setState] = useState({
    phase: 'initiative',
    heroHp: 14,
    goblinHp: 11,
    initiative: null,
    attack: null,
    damage: null,
    log: ['Гоблин выскакивает из-за ящика. Сначала решите инициативу.'],
  })

  const updateLog = (message, partial) =>
    setState((previous) => ({
      ...previous,
      ...partial,
      log: [message, ...previous.log].slice(0, 4),
    }))

  const rollInitiative = () => {
    const hero = rollDie(20) + 2
    const goblin = rollDie(20) + 1
    playArcaneCue(soundEnabled, 'roll')
    updateLog(
      hero >= goblin
        ? `Инициатива ${hero} против ${goblin}. Ты ходишь первым.`
        : `Инициатива ${hero} против ${goblin}. Гоблин всё равно не успел навязать темп.`,
      { initiative: hero, phase: 'action' },
    )
  }

  const chooseAction = (action) => {
    if (action === 'guard') {
      playArcaneCue(soundEnabled, 'success')
      updateLog('Ты встаёшь в защиту и читаешь позицию. Теперь можно атаковать безопаснее.', {
        phase: 'action',
      })
      return
    }

    if (action === 'retreat') {
      playArcaneCue(soundEnabled, 'roll')
      updateLog('Ты отходишь на шаг и всё равно ищешь момент для удара.', { phase: 'action' })
      return
    }

    const attack = rollDie(20) + 5
    const hit = attack >= 13
    playArcaneCue(soundEnabled, hit ? 'success' : 'fail')

    if (!hit) {
      updateLog(`Атака = ${attack}. Клинок проходит рядом, и ты готовишь новый заход.`, {
        attack,
        damage: null,
        phase: 'action',
      })
      return
    }

    updateLog(`Атака = ${attack}. Попадание. Теперь отдельно бросай урон.`, {
      attack,
      damage: null,
      phase: 'damage',
    })
  }

  const rollDamage = () => {
    const damage = rollDie(8) + 2
    const nextHp = Math.max(0, state.goblinHp - damage)
    const victory = nextHp === 0
    playArcaneCue(soundEnabled, victory ? 'achievement' : 'roll')
    updateLog(
      victory
        ? `Урон = ${damage}. Гоблин падает. Ты прошёл весь цикл боя.`
        : `Урон = ${damage}. Гоблин ещё держится, но цикл боя уже понятен.`,
      {
        damage,
        goblinHp: nextHp,
        phase: victory ? 'done' : 'action',
      },
    )

    if (victory) {
      finishOnce()
    }
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-combat">
        <div className="mini-game-combat-bar">
          <span>Ты: {state.heroHp} HP</span>
          <span>Гоблин: {state.goblinHp} HP</span>
        </div>

        <div className="combat-actions">
          {state.phase === 'initiative' && (
            <button className="btn-secondary" onClick={rollInitiative} type="button">
              Бросить инициативу
            </button>
          )}

          {state.phase === 'action' && (
            <>
              <button className="tiny-button" onClick={() => chooseAction('attack')} type="button">
                Атаковать
              </button>
              <button className="tiny-button" onClick={() => chooseAction('guard')} type="button">
                Защититься
              </button>
              <button className="tiny-button" onClick={() => chooseAction('retreat')} type="button">
                Отойти
              </button>
            </>
          )}

          {state.phase === 'damage' && (
            <button className="btn-secondary" onClick={rollDamage} type="button">
              Бросить урон
            </button>
          )}
        </div>

        <div className="mini-game-log">
          {state.log.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

function ACArenaMiniGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [feedback, setFeedback] = useState('')
  const target = AC_ARENA_TARGETS[currentIndex]

  const rollAttack = () => {
    const roll = rollDie(20)
    const total = roll + target.bonus
    const success = total >= target.ac
    setFeedback(
      success
        ? `${target.name}: ${roll} + ${target.bonus} = ${total}. Попадание по AC ${target.ac}.`
        : `${target.name}: ${roll} + ${target.bonus} = ${total}. Этого мало против AC ${target.ac}.`,
    )
    playArcaneCue(soundEnabled, success ? 'success' : 'fail')

    if (currentIndex === AC_ARENA_TARGETS.length - 1) {
      finishOnce({
        rewardText:
          'Ты сравнил атаки с разным AC и теперь лучше чувствуешь, почему одних врагов задеть легче, а других сложнее.',
      })
      return
    }

    setCurrentIndex((previous) => previous + 1)
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-targets">
        {AC_ARENA_TARGETS.map((item, index) => (
          <div
            className={`mini-game-target ${index === currentIndex ? 'is-active' : ''}`}
            key={item.id}
          >
            <strong>{item.name}</strong>
            <span>AC {item.ac}</span>
          </div>
        ))}
      </div>

      <div className="mini-game-board">
        <strong>{target.name}</strong>
        <span>{target.flavor}</span>
      </div>

      <button className="btn-secondary" onClick={rollAttack} type="button">
        Бросить атаку
      </button>

      {feedback && (
        <div className={`mini-game-feedback ${feedback.includes('Попадание') ? 'success' : 'fail'}`}>
          {feedback}
        </div>
      )}
    </div>
  )
}

function DamageForgeMiniGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [weaponIndex, setWeaponIndex] = useState(0)
  const [attackState, setAttackState] = useState(null)
  const [feedback, setFeedback] = useState('')
  const weapon = DAMAGE_FORGE_WEAPONS[weaponIndex]

  const rollAttack = () => {
    const roll = rollDie(20)
    const total = roll + weapon.attackBonus
    const hit = total >= weapon.attackDc
    setAttackState({ roll, total, hit })
    setFeedback(
      hit
        ? `Попадание подтверждено: ${total} против AC ${weapon.attackDc}. Теперь нужен правильный кубик урона.`
        : `Атака дала ${total}, и пока этого мало. Попробуй ещё раз, чтобы дойти до урона.`,
    )
    playArcaneCue(soundEnabled, hit ? 'success' : 'fail')
  }

  const chooseDie = (die) => {
    if (!attackState?.hit) {
      setFeedback('Сначала нужно попасть по цели, а уже потом выбирать кубик урона.')
      playArcaneCue(soundEnabled, 'fail')
      return
    }

    if (die !== weapon.die) {
      setFeedback(`Для оружия ${weapon.name.toLowerCase()} здесь нужен d${weapon.die}.`)
      playArcaneCue(soundEnabled, 'fail')
      return
    }

    const damage = rollDie(die)
    const remainingHp = Math.max(0, weapon.hp - damage)
    setFeedback(
      `Верно: d${die} даёт ${damage} урона. HP падает с ${weapon.hp} до ${remainingHp}.`,
    )
    playArcaneCue(soundEnabled, 'success')

    if (weaponIndex === DAMAGE_FORGE_WEAPONS.length - 1) {
      finishOnce()
      return
    }

    window.setTimeout(() => {
      setWeaponIndex((previous) => previous + 1)
      setAttackState(null)
      setFeedback('')
    }, 700)
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-board">
        <strong>{weapon.name}</strong>
        <div className="mini-game-equation">
          <span>Цель HP: {weapon.hp}</span>
          <span>Попасть: AC {weapon.attackDc}</span>
          <span>Нужный кубик: d{weapon.die}</span>
        </div>
      </div>

      <button className="btn-secondary" onClick={rollAttack} type="button">
        Шаг 1: попасть
      </button>

      <div className="mini-game-dice-grid">
        {[4, 6, 8, 10].map((die) => (
          <button className="dice-chip" key={die} onClick={() => chooseDie(die)} type="button">
            d{die}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mini-game-feedback ${feedback.startsWith('Верно') ? 'success' : 'fail'}`}>
          {feedback}
        </div>
      )}
    </div>
  )
}

function SpellChoiceMiniGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [roundIndex, setRoundIndex] = useState(0)
  const [feedback, setFeedback] = useState('')
  const options = [...SPELL_OPTIONS, LIGHT_SPELL]
  const round = SPELL_SCENES[roundIndex]

  const choose = (spellId) => {
    const spell = options.find((item) => item.id === spellId) ?? options[0]
    const success = spellId === round.answer
    setFeedback(success ? round.success : `${spell.name} здесь звучит красиво, но сцене нужен другой эффект.`)
    playArcaneCue(soundEnabled, success ? 'success' : 'fail')

    if (!success) {
      return
    }

    if (roundIndex === SPELL_SCENES.length - 1) {
      finishOnce()
      return
    }

    setRoundIndex((previous) => previous + 1)
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-board">
        <strong>{round.prompt}</strong>
      </div>

      <div className="mini-game-option-grid">
        {options.map((spell) => (
          <button className="spell-button" key={spell.id} onClick={() => choose(spell.id)} type="button">
            <strong>{spell.name}</strong>
            <span>{spell.description}</span>
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mini-game-feedback ${feedback === round.success ? 'success' : 'fail'}`}>
          {feedback}
        </div>
      )}
    </div>
  )
}

function StoryFlowMiniGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [approach, setApproach] = useState(null)
  const [outcome, setOutcome] = useState(null)

  const selectedApproach = TAVERN_APPROACHES.find((item) => item.id === approach)

  const rollScene = () => {
    if (!selectedApproach) {
      return
    }

    const roll = rollDie(20)
    const total = roll + selectedApproach.bonus
    const success = total >= selectedApproach.dc
    const message = success
      ? `С результатом ${total} ты замечаешь условный знак и история идёт дальше уже по твоей инициативе.`
      : `С результатом ${total} незнакомец замечает тебя первым, но сцена всё равно развивается и даёт новый крючок.`

    setOutcome({ message, success, total })
    playArcaneCue(soundEnabled, success ? 'success' : 'roll')
    finishOnce({
      rewardText:
        'Ты прошёл полный цикл сцены: описание, выбор, бросок и последствия действительно связались в один ритм.',
    })
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-board">
        <strong>Ты входишь в таверну и замечаешь подозрительного человека в углу.</strong>
        <span>Выбери, как герой начнёт сцену.</span>
      </div>

      <div className="mini-game-option-grid">
        {TAVERN_APPROACHES.map((item) => (
          <button
            className={`choice-button ${approach === item.id ? 'is-selected' : ''}`}
            key={item.id}
            onClick={() => {
              setApproach(item.id)
              setOutcome(null)
              playArcaneCue(soundEnabled, 'roll')
            }}
            type="button"
          >
            <strong>{item.label}</strong>
            <span>
              {item.stat} +{item.bonus}
            </span>
          </button>
        ))}
      </div>

      {selectedApproach && (
        <button className="btn-secondary" onClick={rollScene} type="button">
          Бросить проверку сцены
        </button>
      )}

      {outcome && (
        <div className={`mini-game-feedback ${outcome.success ? 'success' : 'fail'}`}>
          {outcome.message}
        </div>
      )}
    </div>
  )
}

function MiniAdventureGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [stage, setStage] = useState('entrance')
  const [log, setLog] = useState([
    'Перед тобой развалины. Сначала реши, как пройти к внутреннему залу.',
  ])
  const [combatState, setCombatState] = useState({ hp: 8, attack: null })

  const pushLog = (message) => {
    setLog((previous) => [message, ...previous].slice(0, 5))
  }

  const resolveEntrance = (mode) => {
    const bonus = mode === 'inspect' ? 3 : 1
    const roll = rollDie(20)
    const total = roll + bonus
    const success = total >= 13
    playArcaneCue(soundEnabled, success ? 'success' : 'roll')
    pushLog(
      success
        ? `Вход пройден: ${total}. Ты находишь тихий проход к сундуку зала.`
        : `Вход дал ${total}. Шум поднялся, но путь внутрь всё равно найден.`,
    )
    setStage('chest')
  }

  const resolveChest = (mode) => {
    const bonus = mode === 'tools' ? 4 : 2
    const roll = rollDie(20)
    const total = roll + bonus
    const success = total >= 14
    playArcaneCue(soundEnabled, success ? 'success' : 'fail')
    pushLog(
      success
        ? `Сундук поддался на ${total}. Внутри карта и звук шагов гоблина.`
        : `Сундук пока не поддался на ${total}, но шум всё равно привлёк гоблина.`,
    )
    setStage('combat')
  }

  const resolveCombat = () => {
    const attack = rollDie(20) + 5
    const hit = attack >= 13
    const damage = hit ? rollDie(8) + 2 : 0
    const hp = Math.max(0, combatState.hp - damage)
    setCombatState({ hp, attack })
    playArcaneCue(soundEnabled, hit ? 'success' : 'fail')
    pushLog(
      hit
        ? `Атака ${attack}, урон ${damage}. Гоблин остаётся с ${hp} HP.`
        : `Атака ${attack}. Гоблин уклоняется, но ты понимаешь ритм боя.`,
    )

    if (hp === 0 || !hit) {
      finishOnce({
        rewardText:
          'Ты связал выбор, проверку, броски и последствия в одно короткое приключение.',
      })
      setStage('done')
    }
  }

  return (
    <div className="mini-game-stage">
      {stage === 'entrance' && (
        <div className="mini-game-option-grid">
          <button className="choice-button" onClick={() => resolveEntrance('inspect')} type="button">
            Осмотреть проход
          </button>
          <button className="choice-button" onClick={() => resolveEntrance('force')} type="button">
            Протиснуться силой
          </button>
        </div>
      )}

      {stage === 'chest' && (
        <div className="mini-game-option-grid">
          <button className="choice-button" onClick={() => resolveChest('tools')} type="button">
            Вскрыть инструментами
          </button>
          <button className="choice-button" onClick={() => resolveChest('bash')} type="button">
            Разбить крышку
          </button>
        </div>
      )}

      {stage === 'combat' && (
        <div className="mini-game-board">
          <strong>Финал сцены: гоблин с {combatState.hp} HP</strong>
          <button className="btn-secondary" onClick={resolveCombat} type="button">
            Провести боевой ход
          </button>
        </div>
      )}

      <div className="mini-game-log">
        {log.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </div>
  )
}

function FinalGauntletGame({ completed, onResolve, soundEnabled }) {
  const finishOnce = useResolveOnce(completed, onResolve)
  const [room, setRoom] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [attackRoll, setAttackRoll] = useState(null)

  const nextRoom = () => setRoom((previous) => previous + 1)

  const finish = () => {
    finishOnce({
      rewardText:
        'Ты прошёл серию игровых комнат и уверенно пользуешься базовыми механиками новичка.',
    })
  }

  const renderRoom = () => {
    if (room === 0) {
      return (
        <>
          <div className="mini-game-board">
            <strong>Комната I: Какая характеристика нужна, чтобы убедить стражника?</strong>
          </div>
          <div className="mini-game-option-grid">
            {['Сила', 'Ловкость', 'Харизма'].map((option) => (
              <button
                className="choice-button"
                key={option}
                onClick={() => {
                  const success = option === 'Харизма'
                  setFeedback(success ? 'Верно. Именно Харизма ведёт эту сцену.' : 'Попробуй ещё раз: здесь решает влияние.')
                  playArcaneCue(soundEnabled, success ? 'success' : 'fail')
                  if (success) {
                    nextRoom()
                  }
                }}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )
    }

    if (room === 1) {
      return (
        <>
          <div className="mini-game-board">
            <strong>Комната II: Брось d20 для проверки скрытности.</strong>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              const roll = rollDie(20)
              const total = roll + 3
              setFeedback(`d20 = ${roll}, итог = ${total}. Проверка прожита.`)
              playArcaneCue(soundEnabled, 'roll')
              nextRoom()
            }}
            type="button"
          >
            Бросить d20
          </button>
        </>
      )
    }

    if (room === 2) {
      return (
        <>
          <div className="mini-game-board">
            <strong>Комната III: Попади по цели с AC 13.</strong>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              const roll = rollDie(20) + 4
              setAttackRoll(roll)
              const success = roll >= 13
              setFeedback(success ? `Атака ${roll}. Попадание.` : `Атака ${roll}. Пока промах, но сравнение с AC понятно.`)
              playArcaneCue(soundEnabled, success ? 'success' : 'roll')
              nextRoom()
            }}
            type="button"
          >
            Бросить атаку
          </button>
        </>
      )
    }

    if (room === 3) {
      return (
        <>
          <div className="mini-game-board">
            <strong>Комната IV: Какой кубик взять для урона мечом?</strong>
          </div>
          <div className="mini-game-dice-grid">
            {[4, 6, 8].map((die) => (
              <button
                className="dice-chip"
                key={die}
                onClick={() => {
                  const success = die === 8
                  setFeedback(success ? 'Верно: для меча здесь подходит d8.' : 'Подумай ещё: меч бьёт тяжелее, чем кинжал.')
                  playArcaneCue(soundEnabled, success ? 'success' : 'fail')
                  if (success) {
                    nextRoom()
                  }
                }}
                type="button"
              >
                d{die}
              </button>
            ))}
          </div>
        </>
      )
    }

    return (
      <>
        <div className="mini-game-board">
          <strong>Комната V: Какое решение лучше поможет раненому союзнику?</strong>
          {attackRoll && <small>Ты уже добрался сюда после атаки {attackRoll}.</small>}
        </div>
        <div className="mini-game-option-grid">
          {['Heal', 'Fire Bolt', 'Shield'].map((option) => (
            <button
              className="spell-button"
              key={option}
              onClick={() => {
                const success = option === 'Heal'
                setFeedback(success ? 'Да. Финальное решение выбрано верно.' : 'Эта опция полезна, но не лечит союзника.')
                playArcaneCue(soundEnabled, success ? 'achievement' : 'fail')
                if (success) {
                  finish()
                }
              }}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      </>
    )
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-room-counter">Комната {Math.min(room + 1, 5)} / 5</div>
      {renderRoom()}
      {feedback && <div className="mini-game-feedback success">{feedback}</div>}
    </div>
  )
}

export default function LessonMiniGame({ completed, lesson, onComplete, soundEnabled }) {
  const [replayKey, setReplayKey] = useState(0)
  const miniGame = lesson.miniGame
  const finishMiniGame = useResolveOnce(completed, (payload = {}) =>
    onComplete?.({
      ...payload,
      xpReward: miniGame.xp,
      rewardText: payload.rewardText ?? miniGame.rewardText,
    }),
  )

  const content = useMemo(() => {
    const sharedProps = {
      completed,
      onResolve: finishMiniGame,
      soundEnabled,
    }

    switch (miniGame.type) {
      case 'dnd-sequence':
        return <SequenceMiniGame {...sharedProps} targetOrder={['dm', 'player', 'dice', 'result']} />
      case 'role-assignment':
        return <RoleAssignmentMiniGame {...sharedProps} />
      case 'dice-altar':
        return <DiceAltarMiniGame {...sharedProps} />
      case 'skill-path':
        return <SkillPathMiniGame {...sharedProps} />
      case 'ability-scenes':
        return <AbilityScenesMiniGame {...sharedProps} />
      case 'modifier-forge':
        return <ModifierForgeMiniGame {...sharedProps} />
      case 'class-scenarios':
        return <ClassScenarioMiniGame {...sharedProps} />
      case 'combat-tutorial':
        return <CombatTutorialMiniGame {...sharedProps} />
      case 'ac-arena':
        return <ACArenaMiniGame {...sharedProps} />
      case 'damage-forge':
        return <DamageForgeMiniGame {...sharedProps} />
      case 'spell-choice':
        return <SpellChoiceMiniGame {...sharedProps} />
      case 'story-flow':
        return <StoryFlowMiniGame {...sharedProps} />
      case 'mini-adventure':
        return <MiniAdventureGame {...sharedProps} />
      case 'final-gauntlet':
        return <FinalGauntletGame {...sharedProps} />
      default:
        return <div className="mini-game-feedback fail">Для этого урока мини-игра ещё не описана.</div>
    }
  }, [completed, finishMiniGame, miniGame.type, soundEnabled])

  return (
    <MiniGameScaffold
      completed={completed}
      miniGame={miniGame}
      onReplay={() => setReplayKey((value) => value + 1)}
    >
      <div key={replayKey}>{content}</div>
    </MiniGameScaffold>
  )
}
