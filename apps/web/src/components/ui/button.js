/**
 * shadcn-compatible Button UI component for Vanilla JS
 * Variants: default, secondary, outline, ghost, destructive, link
 * Sizes: default (h-9), sm (h-8), lg (h-10), icon (size-9)
 */
export function button({
  variant = 'default',
  size = 'default',
  className = '',
  type = 'button',
  id = '',
  disabled = false,
  icon = '',
  label = '',
  attrs = ''
} = {}) {
  const baseClasses = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 gap-2'
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
    primary: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
    outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 border border-border/40',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'text-primary underline-offset-4 hover:underline shadow-none'
  }[variant] || 'bg-primary text-primary-foreground shadow hover:bg-primary/90'

  const sizeClasses = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 rounded-md px-3 text-xs',
    lg: 'h-10 rounded-md px-8 text-base',
    icon: 'size-9 p-0'
  }[size] || 'h-9 px-4 py-2'

  const idAttr = id ? `id="${id}"` : ''
  const disabledAttr = disabled ? 'disabled' : ''

  return `
    <button type="${type}" ${idAttr} class="${baseClasses} ${variantClasses} ${sizeClasses} ${className}" ${disabledAttr} ${attrs}>
      ${icon ? `<span class="inline-flex items-center justify-center shrink-0" data-icon="inline-start">${icon}</span>` : ''}
      ${label ? `<span>${label}</span>` : ''}
    </button>
  `.trim()
}
