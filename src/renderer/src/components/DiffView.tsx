import { useI18n } from '../i18n'

export function DiffView({ text }: { text: string }): JSX.Element {
  const { t } = useI18n()
  if (!text.trim()) return <div className="diff-empty">{t('df.empty')}</div>

  return (
    <pre className="diff">
      {text.split('\n').map((line, i) => {
        let kind = ''
        if (/^(diff |index |--- |\+\+\+ |new file|deleted file|similarity|rename )/.test(line)) kind = 'meta'
        else if (line.startsWith('@@')) kind = 'hunk'
        else if (line.startsWith('+')) kind = 'add'
        else if (line.startsWith('-')) kind = 'del'
        return (
          <div key={i} className={`diff-line ${kind}`}>
            {line || ' '}
          </div>
        )
      })}
    </pre>
  )
}
