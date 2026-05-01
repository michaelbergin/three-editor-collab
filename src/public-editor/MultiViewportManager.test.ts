/**
 * @jest-environment jsdom
 */

import { MultiViewportManager } from '../../public/editor/js/MultiViewportManager.js'
import { createViewportStore } from '../../public/editor/js/ViewportState.js'
import { fireEvent } from '@testing-library/dom'

describe('MultiViewportManager.js', () => {
  type EditorStub = {
    viewportStore: ReturnType<typeof createViewportStore>
  }

  function viewportRows(panel: { dom: HTMLElement }) {
    return [...panel.dom.querySelectorAll('.option')].filter((el) =>
      [...el.querySelectorAll('button')].some((button) => button.textContent === '×'),
    )
  }

  function setupEditorWithStore(): EditorStub {
    const store = createViewportStore()
    return {
      viewportStore: store,
    }
  }

  it('single viewport hides remove control', () => {
    const editor = setupEditorWithStore()
    const panel = MultiViewportManager(editor)
    const rows = viewportRows(panel)
    const removeButtons = panel.dom.querySelectorAll('button')
    expect(rows).toHaveLength(1)
    const hiddenRemove = [...removeButtons].filter(
      (b) => (b as HTMLElement).style.display === 'none',
    )
    expect(hiddenRemove.length).toBeGreaterThanOrEqual(1)
  })

  it('＋ Top adds second viewport row', () => {
    const editor = setupEditorWithStore()
    const panel = MultiViewportManager(editor)

    const addTop = [...panel.dom.querySelectorAll('.option')].find((el) =>
      el.textContent?.includes('＋ Top'),
    )!
    fireEvent.click(addTop)

    expect(editor.viewportStore.getState().viewports).toHaveLength(2)
    expect(viewportRows(panel)).toHaveLength(2)
  })

  it('× removes viewport when multiple exist', () => {
    const editor = setupEditorWithStore()
    const panel = MultiViewportManager(editor)

    editor.viewportStore.dispatch({ type: 'ADD_VIEWPORT', viewportType: 'right' })
    expect(editor.viewportStore.getState().viewports).toHaveLength(2)

    const targetId = 'vp-1-right'
    const dispatchSpy = jest.spyOn(editor.viewportStore, 'dispatch')
    const row = viewportRows(panel).find((el) => el.textContent?.includes('Right'))!
    const removeBtn = [...row.querySelectorAll('button')].find((b) => b.textContent === '×')!
    fireEvent.click(removeBtn)

    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'REMOVE_VIEWPORT', id: targetId })
    expect(editor.viewportStore.getState().viewports).toHaveLength(1)
    expect(editor.viewportStore.getState().viewports.some((v) => v.id === targetId)).toBe(false)
  })
})
