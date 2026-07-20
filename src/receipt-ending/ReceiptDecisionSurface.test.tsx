import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EndDispositionChoice } from './EndDispositionChoice'
import { ReceiptDecisionSurface } from './ReceiptDecisionSurface'

const noop = () => undefined

describe('ReceiptDecisionSurface', () => {
  it('renders both top-level endings with identical semantic structure', () => {
    const html = renderToStaticMarkup(
      <ReceiptDecisionSurface
        eyebrow="RECORD COMPLETE"
        title="The day is documented."
        body="Your receipt is complete. You may leave everything here, or carry one unfinished thing under different conditions."
        choices={[
          {
            id: 'end-here',
            label: 'END THE DAY HERE',
            description: 'Nothing else will be asked of you.',
            onSelect: noop,
          },
          {
            id: 'carry-forward',
            label: 'CARRY ONE THING FORWARD',
            description: 'Choose one remaining obligation and make it smaller.',
            onSelect: noop,
          },
        ]}
      />,
    )

    expect(html.match(/class="receipt-decision__choice"/g)).toHaveLength(2)
    expect(html.match(/data-decision-choice="true"/g)).toHaveLength(2)
    expect(html.match(/aria-describedby=/g)).toHaveLength(2)
    expect(html).toContain('END THE DAY HERE')
    expect(html).toContain('CARRY ONE THING FORWARD')
    expect(html).not.toContain('Skip')
  })

  it('renders Keep and Let Go through the same choice component', () => {
    const html = renderToStaticMarkup(
      <EndDispositionChoice
        onKeep={noop}
        onRelease={noop}
        onBack={noop}
      />,
    )

    expect(html.match(/class="receipt-decision__choice"/g)).toHaveLength(2)
    expect(html).toContain('KEEP RECEIPT')
    expect(html).toContain('LET IT GO')
    expect(html).toContain('Preserve it privately.')
    expect(html).toContain('Release it after it has been acknowledged.')
    expect(html).not.toContain('trash')
  })
})
