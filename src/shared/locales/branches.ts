import type { Entry } from '../i18n'

/** Branch menu and the dialogs to switch, create and merge branches. */
export const branches = {
  'br.search': { es: 'Buscar rama…', en: 'Search branch…' },
  'br.main': { es: 'principal', en: 'default' },
  'br.new': { es: 'Nueva rama…', en: 'New branch…' },
  'br.mergeInto': {
    es: 'Merge de otra rama en <b>{current}</b>…',
    en: 'Merge another branch into <b>{current}</b>…'
  },
  'br.detached': { es: 'HEAD suelto', en: 'Detached HEAD' },

  'br.leave': { es: 'Dejar mis cambios en <code>{current}</code>', en: 'Leave my changes on <code>{current}</code>' },
  'br.leaveHint': {
    es: 'Se guardan aparte. Podrás restaurarlos cuando vuelvas a esa rama.',
    en: 'They are saved aside. You can restore them when you come back to that branch.'
  },
  'br.carry': { es: 'Llevar mis cambios a <code>{target}</code>', en: 'Bring my changes to <code>{target}</code>' },
  'br.carryHint': {
    es: 'Los cambios te siguen a la otra rama. Si chocan con ella, Git lo avisará.',
    en: 'The changes follow you to the other branch. If they clash with it, Git will tell you.'
  },

  'br.switchTitle': { es: 'Cambiar a {target}', en: 'Switch to {target}' },
  'br.switchButton': { es: 'Cambiar de rama', en: 'Switch branch' },
  'br.switchBody': {
    es: 'Tienes {n} {n?archivo|archivos} con cambios sin commit en <b>{current}</b>. ¿Qué quieres hacer con ellos?',
    en: 'You have {n} {n?file|files} with uncommitted changes on <b>{current}</b>. What do you want to do with them?'
  },

  'br.newTitle': { es: 'Nueva rama', en: 'New branch' },
  'br.create': { es: 'Crear rama', en: 'Create branch' },
  'br.name': { es: 'Nombre', en: 'Name' },
  'br.namePlaceholder': { es: 'feature/mi-cambio', en: 'feature/my-change' },
  'br.fromCurrent': {
    es: 'Desde mi rama actual (<code>{current}</code>)',
    en: 'From my current branch (<code>{current}</code>)'
  },
  'br.fromCurrentHint': { es: 'Incluye los commits de esta rama.', en: 'Includes the commits of this branch.' },
  'br.fromBase': { es: 'Desde <code>{base}</code>', en: 'From <code>{base}</code>' },
  'br.fromBaseHint': {
    es: 'Empieza limpia, sin los commits de tu rama actual.',
    en: 'Starts clean, without the commits of your current branch.'
  },
  'br.alreadyThere': { es: 'Ya estás en esa rama.', en: 'You are already on that branch.' },
  'br.noBase': { es: 'No se encontró la rama principal.', en: 'The main branch was not found.' },
  'br.carriedHint': {
    es: 'Tus cambios sin commit se llevan a la nueva rama.',
    en: 'Your uncommitted changes come with you to the new branch.'
  },
  'br.askChanges': {
    es: 'Tienes cambios sin commit. ¿Qué quieres hacer con ellos?',
    en: 'You have uncommitted changes. What do you want to do with them?'
  },
  'br.newBranchLabel': { es: 'la nueva rama', en: 'the new branch' },

  'br.mergeTitle': { es: 'Merge de una rama en {current}', en: 'Merge a branch into {current}' },
  'br.mergeButton': { es: 'Hacer merge', en: 'Merge' },
  'br.mergeButtonN': {
    es: 'Hacer merge de {n} {n?commit|commits}',
    en: 'Merge {n} {n?commit|commits}'
  },
  'br.lastCommit': { es: 'Último commit {time}', en: 'Last commit {time}' },
  'br.mergeUpToDate': {
    es: '<b>{current}</b> ya tiene todo lo de <b>{picked}</b>.',
    en: '<b>{current}</b> already has everything from <b>{picked}</b>.'
  },
  'br.mergeCount': {
    es: '<b>{picked}</b> tiene {n} {n?commit|commits} que <b>{current}</b> no tiene. Se hará merge en <b>{current}</b>.',
    en: '<b>{picked}</b> has {n} {n?commit|commits} that <b>{current}</b> does not have. They will be merged into <b>{current}</b>.'
  },
  'br.mergeConflictHint': {
    es: 'Si hay conflictos, el merge se cancela y tus archivos quedan como estaban.',
    en: 'If there are conflicts, the merge is cancelled and your files stay as they were.'
  }
} satisfies Record<string, Entry>
