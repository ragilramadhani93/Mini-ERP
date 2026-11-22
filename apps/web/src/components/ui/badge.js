/**
 * shadcn-compatible Badge UI component for Vanilla JS
 * Variants: default, secondary, outline, destructive, success, warning, info
 */
export function badge({
  text = '',
  variant = 'default',
  className = '',
  icon = ''
} = {}) {
  const baseClasses = 'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 gap-1.5'

  const variantClasses = {
    default: 'border-transparent bg-primary text-primary-foreground shadow',
    primary: 'border-transparent bg-primary text-primary-foreground shadow',
    secondary: 'border-transparent bg-secondary text-secondary-foreground',
    outline: 'text-foreground border-border',
    destructive: 'border-rose-200/60 bg-rose-50 text-rose-800 font-medium',
    danger: 'border-rose-200/60 bg-rose-50 text-rose-800 font-medium',
    success: 'border-emerald-200/60 bg-emerald-50 text-emerald-800 font-medium',
    warning: 'border-amber-200/60 bg-amber-50 text-amber-900 font-medium',
    info: 'border-sky-200/60 bg-sky-50 text-sky-800 font-medium'
  }[variant] || 'border-transparent bg-primary text-primary-foreground shadow'

  return `
    <span class="${baseClasses} ${variantClasses} ${className}">
      ${icon ? `<span class="inline-flex shrink-0">${icon}</span>` : ''}
      <span>${text}</span>
    </span>
  `.trim()
}
