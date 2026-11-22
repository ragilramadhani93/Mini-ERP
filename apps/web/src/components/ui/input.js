/**
 * shadcn-compatible Input UI component for Vanilla JS
 */
export function input({
  type = 'text',
  placeholder = '',
  value = '',
  id = '',
  name = '',
  className = '',
  disabled = false,
  required = false,
  attrs = ''
} = {}) {
  const baseClasses = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
  const idAttr = id ? `id="${id}"` : ''
  const nameAttr = name ? `name="${name}"` : ''
  const valAttr = value ? `value="${value}"` : ''
  const disAttr = disabled ? 'disabled' : ''
  const reqAttr = required ? 'required' : ''

  return `<input type="${type}" placeholder="${placeholder}" ${valAttr} ${idAttr} ${nameAttr} class="${baseClasses} ${className}" ${disAttr} ${reqAttr} ${attrs}/>`.trim()
}
