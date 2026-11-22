/**
 * shadcn-compatible Separator UI component for Vanilla JS
 */
export function separator({ orientation = 'horizontal', className = '' } = {}) {
  if (orientation === 'vertical') {
    return `<div class="shrink-0 bg-border h-full w-[1px] ${className}"></div>`
  }
  return `<div class="shrink-0 bg-border h-[1px] w-full ${className}"></div>`
}
