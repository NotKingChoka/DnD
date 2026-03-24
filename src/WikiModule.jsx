import { AnimatePresence, motion } from 'framer-motion'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  BookMarked,
  ChevronRight,
  LibraryBig,
  Search,
  Shield,
  Sparkles,
  Swords,
  UserRound,
  WandSparkles,
} from 'lucide-react'
import {
  PHB_PLACEHOLDER_NOTE,
  WIKI_MODE_CONFIG,
  createWikiSearchIndex,
  isPlaceholderContent,
  loadWikiDatabase,
  loadWikiMode,
} from './wikiData'

const modeIconMap = {
  bestiary: Swords,
  'classes-races': UserRound,
  phb: LibraryBig,
  simple: Sparkles,
}

void motion

const crBands = [
  { id: 'all', label: ' CR' },
  { id: 'starter', label: '0-1' },
  { id: 'mid', label: '2-5' },
  { id: 'high', label: '6-10' },
  { id: 'boss', label: '11+' },
]

function crToNumber(value) {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value !== 'string') {
    return 0
  }

  if (value.includes('/')) {
    const [left, right] = value.split('/').map(Number)
    if (left && right) {
      return left / right
    }
  }

  return Number(value) || 0
}

function inCrBand(entry, band) {
  const number = crToNumber(entry.cr)

  switch (band) {
    case 'starter':
      return number <= 1
    case 'mid':
      return number >= 2 && number <= 5
    case 'high':
      return number >= 6 && number <= 10
    case 'boss':
      return number >= 11
    default:
      return true
  }
}

function groupByCategory(items) {
  return items.reduce((groups, item) => {
    groups[item.category] ??= []
    groups[item.category].push(item)
    return groups
  }, {})
}

function scrollToAnchor(anchorId) {
  window.requestAnimationFrame(() => {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function WikiModeButton({ active, mode, onClick }) {
  const Icon = modeIconMap[mode.id] ?? BookMarked

  return (
    <button
      className={`wiki-mode-card ${active ? 'is-active' : ''}`}
      onClick={() => onClick(mode.id)}
      type="button"
    >
      <span className="wiki-mode-icon">
        <Icon size={18} />
      </span>
      <strong>{mode.label}</strong>
      <span>{mode.description}</span>
    </button>
  )
}

function RelatedLinks({ items, onFollow }) {
  if (!items?.length) {
    return null
  }

  return (
    <div className="wiki-related-links">
      {items.map((item) => (
        <button
          className="wiki-link-chip"
          key={`${item.mode}-${item.targetId}-${item.label}`}
          onClick={() => onFollow(item.mode, item.targetId, item.subsection)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function PlaceholderCard() {
  return (
    <div className="wiki-placeholder-card">
      <strong>     </strong>
      <p>{PHB_PLACEHOLDER_NOTE}</p>
      <code>PLACEHOLDER_PHB_CONTENT</code>
    </div>
  )
}

function SearchResults({ loading, query, results, onSelect }) {
  if (!query.trim()) {
    return null
  }

  if (loading) {
    return (
      <div className="wiki-search-panel">
        <span className="wiki-search-status">   </span>
      </div>
    )
  }

  if (!results.length) {
    return (
      <div className="wiki-search-panel">
        <span className="wiki-search-status">    .</span>
      </div>
    )
  }

  const groups = groupByCategory(results)

  return (
    <div className="wiki-search-panel">
      {Object.entries(groups).map(([category, items]) => (
        <div className="wiki-search-group" key={category}>
          <div className="wiki-search-group-title">{category}</div>
          {items.slice(0, 5).map((item) => (
            <button
              className="wiki-search-result"
              key={`${item.category}-${item.sectionId}-${item.label}`}
              onClick={() => onSelect(item)}
              type="button"
            >
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

function WikiModule({ onOpenAcademy }) {
  const [activeMode, setActiveMode] = useState('phb')
  const [modeData, setModeData] = useState({})
  const [database, setDatabase] = useState(null)
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const [selectedPhbSectionId, setSelectedPhbSectionId] = useState('what-is-dd')
  const [selectedSimpleId, setSelectedSimpleId] = useState('dnd-basics')
  const [selectedBestiaryId, setSelectedBestiaryId] = useState('goblin')
  const [collectionFilter, setCollectionFilter] = useState('all')
  const [selectedCollectionId, setSelectedCollectionId] = useState('fighter')
  const [bestiaryTypeFilter, setBestiaryTypeFilter] = useState('all')
  const [bestiaryTerrainFilter, setBestiaryTerrainFilter] = useState('all')
  const [bestiaryCrFilter, setBestiaryCrFilter] = useState('all')

  useEffect(() => {
    if (modeData[activeMode]) {
      return
    }

    let cancelled = false

    loadWikiMode(activeMode).then((data) => {
      if (!cancelled) {
        setModeData((previous) => ({ ...previous, [activeMode]: data }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [activeMode, modeData])

  useEffect(() => {
    if (!deferredQuery.trim() || database) {
      return
    }

    let cancelled = false

    loadWikiDatabase().then((data) => {
      if (!cancelled) {
        setDatabase(data)
      }
    })

    return () => {
      cancelled = true
    }
  }, [database, deferredQuery])

  const phb = modeData.phb
  const simpleWiki = modeData.simple
  const bestiary = modeData.bestiary
  const classRaceData = modeData['classes-races']
  const searchIndex = useMemo(() => createWikiSearchIndex(database), [database])
  const loadingSearch = Boolean(deferredQuery.trim()) && !database

  const phbSelection = useMemo(() => {
    if (!phb?.chapters?.length) {
      return { chapter: null, section: null }
    }

    const chapter =
      phb.chapters.find((item) =>
        item.sections.some((section) => section.id === selectedPhbSectionId),
      ) ?? phb.chapters[0]

    const section =
      chapter.sections.find((item) => item.id === selectedPhbSectionId) ?? chapter.sections[0]

    return { chapter, section }
  }, [phb, selectedPhbSectionId])

  useEffect(() => {
    if (activeMode !== 'phb' || !selectedPhbSectionId) {
      return
    }
    scrollToAnchor(`wiki-anchor-${selectedPhbSectionId}`)
  }, [activeMode, selectedPhbSectionId])

  const filteredBestiary = useMemo(() => {
    if (!bestiary?.entries) {
      return []
    }

    return bestiary.entries.filter((entry) => {
      if (bestiaryTypeFilter !== 'all' && entry.type !== bestiaryTypeFilter) {
        return false
      }

      if (bestiaryTerrainFilter !== 'all' && !entry.terrain.includes(bestiaryTerrainFilter)) {
        return false
      }

      if (!inCrBand(entry, bestiaryCrFilter)) {
        return false
      }

      return true
    })
  }, [bestiary, bestiaryCrFilter, bestiaryTerrainFilter, bestiaryTypeFilter])

  const bestiarySelected =
    filteredBestiary.find((entry) => entry.id === selectedBestiaryId) ?? filteredBestiary[0]

  const bestiaryTypes = useMemo(
    () => ['all', ...new Set((bestiary?.entries ?? []).map((entry) => entry.type))],
    [bestiary],
  )

  const bestiaryTerrains = useMemo(
    () => ['all', ...new Set((bestiary?.entries ?? []).flatMap((entry) => entry.terrain))],
    [bestiary],
  )

  const collectionEntries = useMemo(() => {
    if (!classRaceData) {
      return []
    }

    const classes = (classRaceData.classes?.entries ?? []).map((entry) => ({
      ...entry,
      kind: 'classes',
    }))
    const races = (classRaceData.races?.entries ?? []).map((entry) => ({
      ...entry,
      kind: 'races',
    }))

    if (collectionFilter === 'classes') {
      return classes
    }

    if (collectionFilter === 'races') {
      return races
    }

    return [...classes, ...races]
  }, [classRaceData, collectionFilter])

  const selectedCollectionEntry =
    collectionEntries.find((entry) => entry.id === selectedCollectionId) ?? collectionEntries[0]

  const searchResults = useMemo(() => {
    if (!deferredQuery.trim()) {
      return []
    }

    const normalized = deferredQuery.toLowerCase().trim()
    return searchIndex.filter((item) => item.searchText.includes(normalized))
  }, [deferredQuery, searchIndex])

  const openLink = (mode, targetId, subsection) => {
    setActiveMode(mode)

    if (mode === 'phb') {
      setSelectedPhbSectionId(targetId)
    }

    if (mode === 'simple') {
      setSelectedSimpleId(targetId)
    }

    if (mode === 'bestiary') {
      setSelectedBestiaryId(targetId)
    }

    if (mode === 'classes-races') {
      if (subsection === 'classes' || subsection === 'races') {
        setCollectionFilter(subsection)
      }
      setSelectedCollectionId(targetId)
    }
  }

  const handleSearchSelect = (item) => {
    openLink(item.mode, item.sectionId, item.subsection)
    setQuery('')
  }

  const activeSimpleEntry =
    simpleWiki?.entries?.find((entry) => entry.id === selectedSimpleId) ?? simpleWiki?.entries?.[0]

  return (
    <section className="wiki-shell">
      <div className="wiki-hero">
        <div>
          <span className="section-kicker">D&D Wikipedia</span>
          <h2 className="section-title">  5e   PHB-</h2>
          <p className="section-subtitle">
                 :   , 
            , bestiary     . PHB-   
                 PDF.
          </p>
        </div>

        <button className="btn-secondary wiki-return-button" onClick={onOpenAcademy} type="button">
          <ChevronRight size={16} />
          <span>  </span>
        </button>
      </div>

      <div className="wiki-search-wrap">
        <label className="wiki-search-box">
          <Search size={18} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="   PHB, simple wiki, bestiary,   "
            type="search"
            value={query}
          />
        </label>

        <SearchResults
          loading={loadingSearch}
          onSelect={handleSearchSelect}
          query={query}
          results={searchResults}
        />
      </div>

      <div className="wiki-mode-grid">
        {WIKI_MODE_CONFIG.map((mode) => (
          <WikiModeButton
            active={activeMode === mode.id}
            key={mode.id}
            mode={mode}
            onClick={setActiveMode}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="wiki-stage"
          exit={{ opacity: 0, y: 12 }}
          initial={{ opacity: 0, y: 18 }}
          key={activeMode}
        >
          {activeMode === 'phb' && (
            <PhbMode
              phb={phb}
              selection={phbSelection}
              selectedSectionId={selectedPhbSectionId}
              onFollow={openLink}
              onSelectSection={setSelectedPhbSectionId}
            />
          )}

          {activeMode === 'simple' && (
            <SimpleMode
              entries={simpleWiki?.entries ?? []}
              onFollow={openLink}
              onSelect={setSelectedSimpleId}
              selectedId={activeSimpleEntry?.id}
            />
          )}

          {activeMode === 'bestiary' && (
            <BestiaryMode
              crBand={bestiaryCrFilter}
              entries={filteredBestiary}
              onCrBandChange={setBestiaryCrFilter}
              onSelect={setSelectedBestiaryId}
              onTerrainChange={setBestiaryTerrainFilter}
              onTypeChange={setBestiaryTypeFilter}
              selected={bestiarySelected}
              selectedId={bestiarySelected?.id}
              terrainFilter={bestiaryTerrainFilter}
              terrains={bestiaryTerrains}
              typeFilter={bestiaryTypeFilter}
              types={bestiaryTypes}
            />
          )}

          {activeMode === 'classes-races' && (
            <ClassesRacesMode
              entries={collectionEntries}
              filter={collectionFilter}
              onFilterChange={setCollectionFilter}
              onSelect={setSelectedCollectionId}
              selected={selectedCollectionEntry}
              selectedId={selectedCollectionEntry?.id}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

function PhbMode({ onFollow, onSelectSection, phb, selection, selectedSectionId }) {
  if (!phb?.chapters?.length || !selection.chapter) {
    return <div className="wiki-loading">  PHB</div>
  }

  return (
    <div className="wiki-docs-layout">
      <aside className="wiki-sidebar">
        {phb.chapters.map((chapter) => (
          <div className="wiki-tree-chapter" key={chapter.id}>
            <button
              className={`wiki-tree-chapter-button ${
                selection.chapter.id === chapter.id ? 'is-active' : ''
              }`}
              onClick={() => onSelectSection(chapter.sections[0]?.id)}
              type="button"
            >
              {chapter.title}
            </button>
            <div className="wiki-tree-sections">
              {chapter.sections.map((section) => (
                <button
                  className={`wiki-tree-section ${
                    selectedSectionId === section.id ? 'is-active' : ''
                  }`}
                  key={section.id}
                  onClick={() => onSelectSection(section.id)}
                  type="button"
                >
                  {section.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <div className="wiki-docs-content">
        <div className="wiki-doc-header">
          <span className="wiki-badge">PHB mode</span>
          <h3>{selection.chapter.title}</h3>
          <p>{selection.chapter.summary}</p>
        </div>

        {selection.chapter.sections.map((section) => (
          <article
            className="wiki-doc-section"
            id={`wiki-anchor-${section.id}`}
            key={section.id}
          >
            <div className="wiki-doc-section-header">
              <strong>{section.title}</strong>
              <button
                className="wiki-anchor-button"
                onClick={() => onSelectSection(section.id)}
                type="button"
              >
                
              </button>
            </div>

            {isPlaceholderContent(section.content) ? (
              <PlaceholderCard />
            ) : (
              <p className="wiki-manual-copy">{section.content}</p>
            )}

            <div className="wiki-generated-block">
              <span className="wiki-generated-label"> </span>
              <p>{section.generatedSummary}</p>
            </div>

            <RelatedLinks items={section.related} onFollow={onFollow} />
          </article>
        ))}
      </div>
    </div>
  )
}

function SimpleMode({ entries, onFollow, onSelect, selectedId }) {
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0]

  if (!entries.length || !selected) {
    return <div className="wiki-loading">  </div>
  }

  return (
    <div className="wiki-two-column">
      <div className="wiki-card-list">
        {entries.map((entry) => (
          <button
            className={`wiki-select-card ${selected.id === entry.id ? 'is-active' : ''}`}
            key={entry.id}
            onClick={() => onSelect(entry.id)}
            type="button"
          >
            <strong>{entry.title}</strong>
            <span>{entry.summary}</span>
          </button>
        ))}
      </div>

      <article className="wiki-detail-card">
        <div className="wiki-detail-header">
          <span className="wiki-badge"> </span>
          <h3>{selected.title}</h3>
          <p>{selected.summary}</p>
        </div>
        <p className="wiki-detail-copy">{selected.simpleText}</p>

        <div className="wiki-visual-callout">
          <WandSparkles size={18} />
          <span>{selected.visualCue}</span>
        </div>

        <div className="wiki-example-list">
          {selected.examples.map((example) => (
            <div className="wiki-example-item" key={example}>
              {example}
            </div>
          ))}
        </div>

        <RelatedLinks items={selected.related} onFollow={onFollow} />
      </article>
    </div>
  )
}

function BestiaryMode({
  crBand,
  entries,
  onCrBandChange,
  onSelect,
  onTerrainChange,
  onTypeChange,
  selected,
  selectedId,
  terrainFilter,
  terrains,
  typeFilter,
  types,
}) {
  if (!entries.length) {
    return (
      <div className="wiki-loading">
             .   ,    CR.
      </div>
    )
  }

  if (!selected) {
    return <div className="wiki-loading"> </div>
  }

  return (
    <div className="wiki-two-column">
      <div>
        <div className="wiki-filter-row">
          <select onChange={(event) => onTypeChange(event.target.value)} value={typeFilter}>
            {types.map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? ' ' : item}
              </option>
            ))}
          </select>
          <select onChange={(event) => onTerrainChange(event.target.value)} value={terrainFilter}>
            {terrains.map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? ' ' : item}
              </option>
            ))}
          </select>
          <select onChange={(event) => onCrBandChange(event.target.value)} value={crBand}>
            {crBands.map((band) => (
              <option key={band.id} value={band.id}>
                {band.label}
              </option>
            ))}
          </select>
        </div>

        <div className="wiki-card-grid">
          {entries.map((entry) => (
            <button
              className={`wiki-monster-card ${entry.id === selectedId ? 'is-active' : ''}`}
              key={entry.id}
              onClick={() => onSelect(entry.id)}
              type="button"
            >
              <div className="wiki-monster-top">
                <strong>{entry.name}</strong>
                <span>CR {entry.cr}</span>
              </div>
              <span>{entry.type}</span>
              <div className="wiki-monster-stats">
                <small> {entry.stats.ac}</small>
                <small> {entry.stats.hp}</small>
              </div>
            </button>
          ))}
        </div>
      </div>

      <article className="wiki-detail-card">
        <div className="wiki-detail-header">
          <span className="wiki-badge"></span>
          <h3>{selected.name}</h3>
          <p>
            {selected.type}  {selected.size}  {selected.alignment}
          </p>
        </div>

        <div className="wiki-stat-bar">
          <div><strong></strong><span>{selected.stats.ac}</span></div>
          <div><strong></strong><span>{selected.stats.hp}</span></div>
          <div><strong></strong><span>{selected.stats.speed}</span></div>
        </div>

        <div className="wiki-ability-grid">
          {Object.entries(selected.abilities).map(([ability, score]) => (
            <div className="wiki-ability-pill" key={ability}>
              <strong>{ability.toUpperCase()}</strong>
              <span>{score}</span>
            </div>
          ))}
        </div>

        <div className="wiki-detail-section">
          <strong> </strong>
          {selected.traits.map((trait) => (
            <div className="wiki-trait-item" key={trait.name}>
              <span>{trait.name}</span>
              <p>{trait.effect}</p>
            </div>
          ))}
        </div>

        <div className="wiki-detail-section">
          <strong></strong>
          <div className="wiki-chip-row">
            {selected.actions.map((action) => (
              <span className="wiki-tag" key={action}>
                {action}
              </span>
            ))}
          </div>
        </div>

        <div className="wiki-detail-section">
          <strong> </strong>
          <div className="wiki-chip-row">
            {selected.terrain.map((item) => (
              <span className="wiki-tag" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>

        <p className="wiki-detail-copy">{selected.lore}</p>
      </article>
    </div>
  )
}

function ClassesRacesMode({ entries, filter, onFilterChange, onSelect, selected, selectedId }) {
  if (!selected) {
    return <div className="wiki-loading">   </div>
  }

  return (
    <div className="wiki-two-column">
      <div>
        <div className="wiki-filter-pills">
          {[
            { id: 'all', label: '' },
            { id: 'classes', label: '' },
            { id: 'races', label: '' },
          ].map((item) => (
            <button
              className={`wiki-filter-pill ${filter === item.id ? 'is-active' : ''}`}
              key={item.id}
              onClick={() => onFilterChange(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="wiki-card-grid">
          {entries.map((entry) => (
            <button
              className={`wiki-select-card ${entry.id === selectedId ? 'is-active' : ''}`}
              key={`${entry.kind}-${entry.id}`}
              onClick={() => onSelect(entry.id)}
              type="button"
            >
              <div className="wiki-select-card-top">
                <strong>{entry.name}</strong>
                <span>{entry.kind === 'classes' ? '' : ''}</span>
              </div>
              <span>{entry.kind === 'classes' ? entry.role : entry.identity}</span>
            </button>
          ))}
        </div>
      </div>

      <article className="wiki-detail-card">
        <div className="wiki-detail-header">
          <span className="wiki-badge">
            {selected.kind === 'classes' ? '' : ''}
          </span>
          <h3>{selected.name}</h3>
          <p>{selected.kind === 'classes' ? selected.description : selected.identity}</p>
        </div>

        {selected.kind === 'classes' ? (
          <>
            <div className="wiki-stat-bar">
              <div><strong> </strong><span>d{selected.hitDie}</span></div>
              <div><strong></strong><span>{selected.keyAbility}</span></div>
              <div><strong></strong><span>{selected.spellcasting}</span></div>
            </div>
            <div className="wiki-detail-section">
              <strong> </strong>
              <div className="wiki-chip-row">
                {selected.coreFeatures.map((item) => (
                  <span className="wiki-tag" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="wiki-detail-section">
              <strong> </strong>
              <div className="wiki-chip-row">
                {selected.subclassExamples.map((item) => (
                  <span className="wiki-tag" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="wiki-level-bands">
              {Object.entries(selected.levelBands).map(([band, text]) => (
                <div className="wiki-level-band" key={band}>
                  <strong>{band}</strong>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="wiki-stat-bar">
              <div><strong></strong><span>{selected.size}</span></div>
              <div><strong></strong><span>{selected.speed} </span></div>
              <div><strong></strong><span>{selected.abilityFocus}</span></div>
            </div>
            <p className="wiki-detail-copy">{selected.description}</p>
            <div className="wiki-detail-section">
              <strong></strong>
              {selected.traits.map((trait) => (
                <div className="wiki-trait-item" key={trait.name}>
                  <span>{trait.name}</span>
                  <p>{trait.effect}</p>
                </div>
              ))}
            </div>
            <div className="wiki-detail-section">
              <strong>  </strong>
              {selected.subraces.map((subrace) => (
                <div className="wiki-trait-item" key={subrace.name}>
                  <span>{subrace.name}</span>
                  <p>{subrace.hook}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </article>
    </div>
  )
}

export default WikiModule
