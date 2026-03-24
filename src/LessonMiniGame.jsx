import { useEffect, useMemo, useRef, useState } from 'react'
import { CLASS_OPTIONS, SPELL_OPTIONS } from './courseData'
import { playArcaneCue, rollDie } from './utils'

const DND_SEQUENCE_OPTIONS = [
  { id: 'dm', label: '  ', note: '    .' },
  { id: 'player', label: '  ', note: '   .' },
  { id: 'dice', label: '  ', note: ' ,   .' },
  { id: 'result', label: '  ', note: '  .' },
]

const ROLE_ASSIGNMENT_CARDS = [
  { id: 'describe', text: '      .', answer: 'dm' },
  { id: 'choice', text: '    .', answer: 'player' },
  { id: 'check', text: ' d20   .', answer: 'roll' },
  { id: 'result', text: '  16  .', answer: 'roll' },
]

const ROLE_OPTIONS = [
  { id: 'dm', label: '' },
  { id: 'player', label: '' },
  { id: 'roll', label: '' },
]

const DICE_ALTAR_ROUNDS = [
  {
    id: 'trap',
    prompt: ':      ?',
    answer: 'd20',
    options: ['d4', 'd6', 'd20'],
    success: '      d20.',
  },
  {
    id: 'sword',
    prompt: '     .',
    answer: 'd6',
    options: ['d6', 'd12', 'd20'],
    success: '    d6  .',
  },
  {
    id: 'iconic',
    prompt: '   D&D   .',
    answer: 'd20',
    options: ['d8', 'd20', 'd10'],
    success: ' d20     D&D.',
  },
]

const SKILL_PATH_CHECKS = [
  { id: 'jump', prompt: '    ', bonus: 2, dc: 13, stat: '' },
  { id: 'hide', prompt: '    ', bonus: 3, dc: 14, stat: '' },
  { id: 'tracks', prompt: '    ', bonus: 1, dc: 12, stat: '' },
  { id: 'lock', prompt: '    ', bonus: 4, dc: 15, stat: '' },
]

const ABILITY_SCENES = [
  {
    id: 'stone',
    prompt: '    ',
    answer: '',
    options: ['', '', '', '', '', ''],
    success: '      .',
  },
  {
    id: 'guard',
    prompt: '    ',
    answer: '',
    options: ['', '', '', '', '', ''],
    success: '  ,    .',
  },
  {
    id: 'forest',
    prompt: '    ',
    answer: '',
    options: ['', '', '', '', '', ''],
    success: '  ,   .',
  },
  {
    id: 'symbol',
    prompt: '    ',
    answer: '',
    options: ['', '', '', '', '', ''],
    success: '     .',
  },
  {
    id: 'jump-2',
    prompt: '  ',
    answer: '',
    options: ['', '', '', '', '', ''],
    success: '  ,    .',
  },
]

const MODIFIER_FORGE_ROUNDS = [
  { id: 'door', roll: 12, bonus: 3, answer: 15, options: [14, 15, 16], prompt: '   15  .' },
  { id: 'trap', roll: 9, bonus: 4, answer: 13, options: [12, 13, 14], prompt: '   .' },
  { id: 'jump', roll: 16, bonus: 2, answer: 18, options: [18, 19, 20], prompt: '   .' },
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
          <span className="section-kicker"> </span>
          <h3 className="section-title">{miniGame.title}</h3>
          <p className="section-subtitle">{miniGame.intro}</p>
        </div>
        <div className="mini-game-status">
          <span className="result-pill">+{miniGame.xp} XP</span>
          <button className="ghost-button" onClick={onReplay} type="button">
            
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
        ? '  .      D&D.'
        : ' .   ,   ,      .',
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
              <span>{selected?.label ?? ' '}</span>
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
        <div className={`mini-game-feedback ${feedback.startsWith('') ? 'success' : 'fail'}`}>
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
      setFeedback('     .')
      playArcaneCue(soundEnabled, 'fail')
      return
    }

    const success = ROLE_ASSIGNMENT_CARDS.every((card) => answers[card.id] === card.answer)
    setFeedback(
      success
        ? '.  ,  ,      .'
        : '. ,    ,        .',
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
         
      </button>

      {feedback && (
        <div className={`mini-game-feedback ${feedback.startsWith('') ? 'success' : 'fail'}`}>
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
    setFeedback(success ? round.success : '     .    .')
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
           {roundIndex + 1} / {DICE_ALTAR_ROUNDS.length}
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
          '      ,      .',
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
          <span>: +{round.bonus}</span>
          <span>{round.stat}</span>
          <span>DC {round.dc}</span>
        </div>
      </div>

      <button className="btn-secondary" onClick={rollCheck} type="button">
         d20
      </button>

      {latest && latest.id === round.id && (
        <div className={`mini-game-feedback ${latest.success ? 'success' : 'fail'}`}>
          d20 = {latest.roll},  = {latest.total}.{' '}
          {latest.success ? ' .' : '  ,     .'}
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
    setFeedback(success ? round.success : ' . ,       .')
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
           {roundIndex + 1} / {ABILITY_SCENES.length}
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
    prompt: '    ',
    answer: 'fighter',
    options: ['fighter', 'rogue', 'wizard', 'bard'],
    success: '      .',
  },
  {
    id: 'shadow',
    prompt: '   ',
    answer: 'rogue',
    options: ['paladin', 'rogue', 'cleric', 'barbarian'],
    success: '      .',
  },
  {
    id: 'heal',
    prompt: '   ',
    answer: 'cleric',
    options: ['fighter', 'cleric', 'wizard', 'ranger'],
    success: '     .',
  },
  {
    id: 'arcane',
    prompt: '    ',
    answer: 'wizard',
    options: ['wizard', 'bard', 'fighter', 'paladin'],
    success: '       .',
  },
  {
    id: 'support',
    prompt: '    ',
    answer: 'bard',
    options: ['bard', 'barbarian', 'paladin', 'ranger'],
    success: '       .',
  },
]

const AC_ARENA_TARGETS = [
  { id: 'goblin', name: '', ac: 12, bonus: 4, flavor: '  .' },
  { id: 'skeleton', name: '', ac: 14, bonus: 4, flavor: ',  .' },
  { id: 'knight', name: '', ac: 18, bonus: 4, flavor: '   .' },
]

const DAMAGE_FORGE_WEAPONS = [
  { id: 'dagger', name: '', die: 4, hp: 5, attackBonus: 5, attackDc: 11 },
  { id: 'sword', name: '', die: 8, hp: 8, attackBonus: 5, attackDc: 12 },
  { id: 'hammer', name: '', die: 10, hp: 10, attackBonus: 5, attackDc: 13 },
]

const LIGHT_SPELL = {
  id: 'light',
  name: 'Light',
  description: '  .',
  effect: '       .',
}

const SPELL_SCENES = [
  {
    id: 'ally',
    prompt: '      .',
    answer: 'heal',
    success: 'Ҹ      .',
  },
  {
    id: 'far',
    prompt: '     .',
    answer: 'fire-bolt',
    success: '        .',
  },
  {
    id: 'defense',
    prompt: '     .',
    answer: 'shield',
    success: '      .',
  },
  {
    id: 'dark',
    prompt: 'Ҹ     .',
    answer: 'light',
    success: '      .',
  },
]

const TAVERN_APPROACHES = [
  { id: 'observe', label: ' ', bonus: 2, dc: 12, stat: '' },
  { id: 'talk', label: '  ', bonus: 3, dc: 13, stat: '' },
  { id: 'watch', label: '   ', bonus: 1, dc: 11, stat: '' },
  { id: 'ignore', label: ' ,   ', bonus: 0, dc: 10, stat: '' },
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
        ? `. ${round.roll} + ${round.bonus} = ${round.answer}.`
        : '.  d20    .',
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
          <span> = +{round.bonus}</span>
          <span> = ?</span>
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
        <div className={`mini-game-feedback ${feedback.startsWith('') ? 'success' : 'fail'}`}>
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
    setFeedback(success ? round.success : '   ,       .')
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
        <small> ,      .</small>
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
    log: ['  - .   .'],
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
        ? ` ${hero}  ${goblin}.   .`
        : ` ${hero}  ${goblin}.       .`,
      { initiative: hero, phase: 'action' },
    )
  }

  const chooseAction = (action) => {
    if (action === 'guard') {
      playArcaneCue(soundEnabled, 'success')
      updateLog('      .    .', {
        phase: 'action',
      })
      return
    }

    if (action === 'retreat') {
      playArcaneCue(soundEnabled, 'roll')
      updateLog('          .', { phase: 'action' })
      return
    }

    const attack = rollDie(20) + 5
    const hit = attack >= 13
    playArcaneCue(soundEnabled, hit ? 'success' : 'fail')

    if (!hit) {
      updateLog(` = ${attack}.   ,     .`, {
        attack,
        damage: null,
        phase: 'action',
      })
      return
    }

    updateLog(` = ${attack}. .    .`, {
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
        ? ` = ${damage}.  .     .`
        : ` = ${damage}.   ,     .`,
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
          <span>: {state.heroHp} HP</span>
          <span>: {state.goblinHp} HP</span>
        </div>

        <div className="combat-actions">
          {state.phase === 'initiative' && (
            <button className="btn-secondary" onClick={rollInitiative} type="button">
               
            </button>
          )}

          {state.phase === 'action' && (
            <>
              <button className="tiny-button" onClick={() => chooseAction('attack')} type="button">
                
              </button>
              <button className="tiny-button" onClick={() => chooseAction('guard')} type="button">
                
              </button>
              <button className="tiny-button" onClick={() => chooseAction('retreat')} type="button">
                
              </button>
            </>
          )}

          {state.phase === 'damage' && (
            <button className="btn-secondary" onClick={rollDamage} type="button">
               
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
        ? `${target.name}: ${roll} + ${target.bonus} = ${total}.   AC ${target.ac}.`
        : `${target.name}: ${roll} + ${target.bonus} = ${total}.    AC ${target.ac}.`,
    )
    playArcaneCue(soundEnabled, success ? 'success' : 'fail')

    if (currentIndex === AC_ARENA_TARGETS.length - 1) {
      finishOnce({
        rewardText:
          '     AC    ,     ,   .',
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
         
      </button>

      {feedback && (
        <div className={`mini-game-feedback ${feedback.includes('') ? 'success' : 'fail'}`}>
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
        ? ` : ${total}  AC ${weapon.attackDc}.     .`
        : `  ${total},    .   ,    .`,
    )
    playArcaneCue(soundEnabled, hit ? 'success' : 'fail')
  }

  const chooseDie = (die) => {
    if (!attackState?.hit) {
      setFeedback('    ,      .')
      playArcaneCue(soundEnabled, 'fail')
      return
    }

    if (die !== weapon.die) {
      setFeedback(`  ${weapon.name.toLowerCase()}   d${weapon.die}.`)
      playArcaneCue(soundEnabled, 'fail')
      return
    }

    const damage = rollDie(die)
    const remainingHp = Math.max(0, weapon.hp - damage)
    setFeedback(
      `: d${die}  ${damage} . HP   ${weapon.hp}  ${remainingHp}.`,
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
          <span> HP: {weapon.hp}</span>
          <span>: AC {weapon.attackDc}</span>
          <span> : d{weapon.die}</span>
        </div>
      </div>

      <button className="btn-secondary" onClick={rollAttack} type="button">
         1: 
      </button>

      <div className="mini-game-dice-grid">
        {[4, 6, 8, 10].map((die) => (
          <button className="dice-chip" key={die} onClick={() => chooseDie(die)} type="button">
            d{die}
          </button>
        ))}
      </div>

      {feedback && (
        <div className={`mini-game-feedback ${feedback.startsWith('') ? 'success' : 'fail'}`}>
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
    setFeedback(success ? round.success : `${spell.name}   ,     .`)
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
      ? `  ${total}            .`
      : `  ${total}    ,         .`

    setOutcome({ message, success, total })
    playArcaneCue(soundEnabled, success ? 'success' : 'roll')
    finishOnce({
      rewardText:
        '    : , ,        .',
    })
  }

  return (
    <div className="mini-game-stage">
      <div className="mini-game-board">
        <strong>         .</strong>
        <span>,    .</span>
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
    '  .  ,     .',
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
        ? ` : ${total}.       .`
        : `  ${total}.  ,      .`,
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
        ? `   ${total}.      .`
        : `     ${total},      .`,
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
        ? ` ${attack},  ${damage}.    ${hp} HP.`
        : ` ${attack}.  ,     .`,
    )

    if (hp === 0 || !hit) {
      finishOnce({
        rewardText:
          '  , ,       .',
      })
      setStage('done')
    }
  }

  return (
    <div className="mini-game-stage">
      {stage === 'entrance' && (
        <div className="mini-game-option-grid">
          <button className="choice-button" onClick={() => resolveEntrance('inspect')} type="button">
             
          </button>
          <button className="choice-button" onClick={() => resolveEntrance('force')} type="button">
             
          </button>
        </div>
      )}

      {stage === 'chest' && (
        <div className="mini-game-option-grid">
          <button className="choice-button" onClick={() => resolveChest('tools')} type="button">
             
          </button>
          <button className="choice-button" onClick={() => resolveChest('bash')} type="button">
             
          </button>
        </div>
      )}

      {stage === 'combat' && (
        <div className="mini-game-board">
          <strong> :   {combatState.hp} HP</strong>
          <button className="btn-secondary" onClick={resolveCombat} type="button">
              
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
        '          .',
    })
  }

  const renderRoom = () => {
    if (room === 0) {
      return (
        <>
          <div className="mini-game-board">
            <strong> I:   ,   ?</strong>
          </div>
          <div className="mini-game-option-grid">
            {['', '', ''].map((option) => (
              <button
                className="choice-button"
                key={option}
                onClick={() => {
                  const success = option === ''
                  setFeedback(success ? '.     .' : '  :   .')
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
            <strong> II:  d20   .</strong>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              const roll = rollDie(20)
              const total = roll + 3
              setFeedback(`d20 = ${roll},  = ${total}.  .`)
              playArcaneCue(soundEnabled, 'roll')
              nextRoom()
            }}
            type="button"
          >
             d20
          </button>
        </>
      )
    }

    if (room === 2) {
      return (
        <>
          <div className="mini-game-board">
            <strong> III:     AC 13.</strong>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              const roll = rollDie(20) + 4
              setAttackRoll(roll)
              const success = roll >= 13
              setFeedback(success ? ` ${roll}. .` : ` ${roll}.  ,    AC .`)
              playArcaneCue(soundEnabled, success ? 'success' : 'roll')
              nextRoom()
            }}
            type="button"
          >
             
          </button>
        </>
      )
    }

    if (room === 3) {
      return (
        <>
          <div className="mini-game-board">
            <strong> IV:      ?</strong>
          </div>
          <div className="mini-game-dice-grid">
            {[4, 6, 8].map((die) => (
              <button
                className="dice-chip"
                key={die}
                onClick={() => {
                  const success = die === 8
                  setFeedback(success ? ':     d8.' : ' :   ,  .')
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
          <strong> V:      ?</strong>
          {attackRoll && <small>      {attackRoll}.</small>}
        </div>
        <div className="mini-game-option-grid">
          {['Heal', 'Fire Bolt', 'Shield'].map((option) => (
            <button
              className="spell-button"
              key={option}
              onClick={() => {
                const success = option === 'Heal'
                setFeedback(success ? '.    .' : '  ,    .')
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
      <div className="mini-game-room-counter"> {Math.min(room + 1, 5)} / 5</div>
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
        return <div className="mini-game-feedback fail">   -   .</div>
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
