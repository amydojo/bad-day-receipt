import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DEFAULT_INTERACTION_POLICIES } from '../interactionBudget'
import { CarryForwardDesignation } from './CarryForwardDesignation'
import { OneThingPreset } from './OneThingPreset'
import { OptionalSourceDisclosure } from './OptionalSourceDisclosure'

const noOp = () => undefined

describe('CarryForwardDesignation', () => {
  it('starts direct entry with a native manual field and no receipt-continuity claim', () => {
    const html = renderToStaticMarkup(
      <CarryForwardDesignation origin={{ kind: 'direct' }} onNothingAfterAll={noOp} />,
    )
    expect(html).toContain('What is still asking something from you?')
    expect(html).toContain('Only you can designate it.')
    expect(html).toContain('id="carry-designation-task"')
    expect(html).toContain('NOTHING AFTER ALL')
    expect(html).not.toContain('POSSIBLE REMAINING THING')
    expect(html).not.toContain('receiptId')
    expect(html).not.toContain('/api/compile-task')
  })

  it('shows one explicit receipt-origin candidate without selecting it', () => {
    const html = renderToStaticMarkup(
      <CarryForwardDesignation
        origin={{
          kind: 'receipt',
          receiptId: 'BD-84',
          explicitInputs: { authoredDemoFixtures: ['Reply to the insurance denial'] },
        }}
        onNothingAfterAll={noOp}
      />,
    )
    expect(html).toContain('POSSIBLE REMAINING THING')
    expect(html).toContain('Reply to the insurance denial')
    expect(html).toContain('THIS ONE')
    expect(html).toContain('EDIT')
    expect(html).toContain('CHOOSE SOMETHING ELSE')
    expect(html).not.toContain('checked')
  })

  it('shows several explicit obligations as unselected native choices', () => {
    const html = renderToStaticMarkup(
      <CarryForwardDesignation
        origin={{
          kind: 'receipt',
          receiptId: 'BD-84',
          explicitInputs: {
            explicitCurrentInputs: ['Reply to the landlord', 'Review the estimate'],
          },
        }}
        onNothingAfterAll={noOp}
      />,
    )
    expect(html.match(/type="radio"/g)).toHaveLength(2)
    expect(html).toContain('Nothing is selected automatically.')
    expect(html).not.toContain('checked')
  })

  it('connects optional source privacy and preserves a collapsed native disclosure', () => {
    const collapsed = renderToStaticMarkup(
      <OptionalSourceDisclosure
        expanded={false}
        value="Private text"
        onExpand={noOp}
        onCollapse={noOp}
        onChange={noOp}
      />,
    )
    expect(collapsed).toContain('ADD SOURCE TEXT OR CONTEXT')
    expect(collapsed).toContain('not added to receipt history')
    expect(collapsed).toContain('aria-expanded="false"')
    expect(collapsed).not.toContain('<textarea')

    const expanded = renderToStaticMarkup(
      <OptionalSourceDisclosure
        expanded
        value="Private text"
        onExpand={noOp}
        onCollapse={noOp}
        onChange={noOp}
      />,
    )
    expect(expanded).toContain('<textarea')
    expect(expanded).toContain('Private text')
  })

  it('renders the recommended existing policies without a compiler action', () => {
    const html = renderToStaticMarkup(
      <OneThingPreset
        policies={DEFAULT_INTERACTION_POLICIES}
        customizing={false}
        onIssue={noOp}
        onOpenCustomize={noOp}
        onTogglePolicy={noOp}
        onCloseCustomize={noOp}
      />,
    )
    expect(html).toContain('ONE THING MODE')
    expect(html).toContain('One active step')
    expect(html).toContain('Fewer visible choices')
    expect(html).toContain('Progress preserved')
    expect(html).toContain('Nothing sent automatically')
    expect(html).toContain('ISSUE ADJUSTMENT')
    expect(html).toContain('CUSTOMIZE')
    expect(html).not.toContain('BEGIN ONE THING MODE')
    expect(html).not.toContain('/api/compile-task')
  })
})
