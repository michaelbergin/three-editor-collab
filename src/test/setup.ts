import '@testing-library/jest-dom'

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: () => null,
})

if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = function () {}
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = function () {}
}

if (!globalThis.PointerEvent) {
  globalThis.PointerEvent = class extends MouseEvent {
    constructor(type: string, init?: PointerEventInit) {
      super(type, init)
    }
  } as typeof PointerEvent
}
