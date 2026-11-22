/**
 * shadcn-compatible Card UI component for Vanilla JS
 * Structure: Card -> CardHeader (CardTitle, CardDescription) -> CardContent -> CardFooter
 */
export function card({
  title = '',
  description = '',
  content = '',
  footer = '',
  headerAction = '',
  className = '',
  id = ''
} = {}) {
  const idAttr = id ? `id="${id}"` : ''
  const hasHeader = title || description || headerAction

  return `
    <div ${idAttr} class="rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-all ${className}">
      ${hasHeader ? `
        <div class="flex flex-col space-y-1.5 p-6">
          <div class="flex items-center justify-between">
            ${title ? `<h3 class="font-semibold leading-none tracking-tight text-foreground text-lg">${title}</h3>` : ''}
            ${headerAction ? `<div class="flex items-center gap-2">${headerAction}</div>` : ''}
          </div>
          ${description ? `<p class="text-sm text-muted-foreground">${description}</p>` : ''}
        </div>
      ` : ''}
      ${content ? `<div class="p-6 ${hasHeader ? 'pt-0' : ''}">${content}</div>` : ''}
      ${footer ? `<div class="flex items-center p-6 pt-0 border-t border-border/40 mt-4">${footer}</div>` : ''}
    </div>
  `.trim()
}
