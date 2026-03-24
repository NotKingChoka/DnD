export const PLACEHOLDER_PHB_CONTENT = 'PLACEHOLDER_PHB_CONTENT'

// Здесь будет контент из книги игрока (можно вставить вручную позже)
export const PHB_PLACEHOLDER_NOTE =
  'Здесь будет контент из книги игрока (можно вставить вручную позже)'

export const WIKI_MODE_CONFIG = [
  {
    description: 'Структура книги игрока с главами, разделами и местом под ручную вставку текста.',
    id: 'phb',
    label: 'Полная книга',
  },
  {
    description: 'Простые объяснения, короткие примеры и визуальные шпаргалки.',
    id: 'simple',
    label: 'Простая версия',
  },
  {
    description: 'Карточки существ, фильтры по типу и среде, быстрые боевые ориентиры.',
    id: 'bestiary',
    label: 'Бестиарий',
  },
  {
    description: 'Классы, расы, ключевые способности и связи с другими режимами.',
    id: 'classes-races',
    label: 'Классы и расы',
  },
]

export function isPlaceholderContent(content) {
  return content === PLACEHOLDER_PHB_CONTENT
}

export async function loadWikiDatabase() {
  const [phbModule, simpleModule, bestiaryModule, classesModule, racesModule, glossaryModule] =
    await Promise.all([
      import('./data/wiki/phb.json'),
      import('./data/wiki/simpleWiki.json'),
      import('./data/wiki/bestiary.json'),
      import('./data/wiki/classes.json'),
      import('./data/wiki/races.json'),
      import('./data/wiki/glossary.json'),
    ])

  return {
    ...phbModule.default,
    ...simpleModule.default,
    ...bestiaryModule.default,
    ...classesModule.default,
    ...racesModule.default,
    ...glossaryModule.default,
  }
}

export async function loadWikiMode(mode) {
  switch (mode) {
    case 'phb': {
      const module = await import('./data/wiki/phb.json')
      return module.default.phb
    }
    case 'simple': {
      const module = await import('./data/wiki/simpleWiki.json')
      return module.default.simpleWiki
    }
    case 'bestiary': {
      const module = await import('./data/wiki/bestiary.json')
      return module.default.bestiary
    }
    case 'classes-races': {
      const [classesModule, racesModule] = await Promise.all([
        import('./data/wiki/classes.json'),
        import('./data/wiki/races.json'),
      ])

      return {
        classes: classesModule.default.classes,
        races: racesModule.default.races,
      }
    }
    case 'glossary': {
      const module = await import('./data/wiki/glossary.json')
      return module.default.glossary
    }
    default:
      return null
  }
}

export function createWikiSearchIndex(database) {
  if (!database) {
    return []
  }

  const index = []

  database.phb?.chapters?.forEach((chapter) => {
    chapter.sections?.forEach((section) => {
      index.push({
        category: 'PHB',
        description: section.generatedSummary,
        label: `${chapter.title} / ${section.title}`,
        mode: 'phb',
        searchText: [
          chapter.title,
          section.title,
          section.generatedSummary,
          section.manualInsertHint,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
        sectionId: section.id,
        sectionTitle: section.title,
      })
    })
  })

  database.simpleWiki?.entries?.forEach((entry) => {
    index.push({
      category: 'Простая версия',
      description: entry.summary,
      label: entry.title,
      mode: 'simple',
      searchText: [entry.title, entry.summary, entry.simpleText, ...(entry.examples ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
      sectionId: entry.id,
      sectionTitle: entry.title,
    })
  })

  database.bestiary?.entries?.forEach((entry) => {
    index.push({
      category: 'Бестиарий',
      description: `${entry.type} • ${entry.cr} • ${entry.terrain.join(', ')}`,
      label: entry.name,
      mode: 'bestiary',
      searchText: [
        entry.name,
        entry.type,
        entry.alignment,
        entry.lore,
        ...(entry.tags ?? []),
        ...(entry.traits ?? []).map((item) => item.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
      sectionId: entry.id,
      sectionTitle: entry.name,
    })
  })

  database.classes?.entries?.forEach((entry) => {
    index.push({
      category: 'Классы',
      description: `${entry.role} • d${entry.hitDie} • ключевая характеристика: ${entry.keyAbility}`,
      label: entry.name,
      mode: 'classes-races',
      searchText: [
        entry.name,
        entry.role,
        entry.keyAbility,
        entry.description,
        ...(entry.coreFeatures ?? []),
        ...(entry.subclassExamples ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
      sectionId: entry.id,
      sectionTitle: entry.name,
      subsection: 'classes',
    })
  })

  database.races?.entries?.forEach((entry) => {
    index.push({
      category: 'Расы',
      description: `${entry.size} • скорость ${entry.speed} футов • ${entry.identity}`,
      label: entry.name,
      mode: 'classes-races',
      searchText: [
        entry.name,
        entry.identity,
        entry.description,
        ...(entry.subraces ?? []).map((item) => item.name),
        ...(entry.traits ?? []).map((item) => item.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
      sectionId: entry.id,
      sectionTitle: entry.name,
      subsection: 'races',
    })
  })

  database.glossary?.terms?.forEach((term) => {
    index.push({
      category: 'Глоссарий',
      description: term.definition,
      label: term.term,
      mode: term.mode ?? 'simple',
      searchText: [term.term, term.definition].join(' ').toLowerCase(),
      sectionId: term.targetId,
      sectionTitle: term.term,
      subsection: term.subsection,
    })
  })

  return index
}
