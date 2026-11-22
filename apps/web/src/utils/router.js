export class Router {
  constructor(routes, auth) {
    this.routes = routes
    this.auth = auth
    this.currentRoute = null
    this.onRouteChange = null
  }

  navigate(fullPath) {
    const rawPath = fullPath || '/'
    const [pathOnly, queryString] = rawPath.split('?')
    const route = this.routes[pathOnly]
    if (!route) {
      if (pathOnly !== '/') {
        this.navigate('/')
      }
      return
    }

    if (!route.public) {
      if (!this.auth.isAuthenticated()) {
        this.navigate('/login')
        return
      }
      if (route.roles && !this.auth.hasRole(...route.roles)) {
        this.navigate('/')
        return
      }
    }

    const params = new URLSearchParams(queryString || '')
    const query = Object.fromEntries(params.entries())

    this.currentRoute = { path: pathOnly, fullPath: rawPath, query, ...route }
    window.location.hash = rawPath
    this.onRouteChange?.(this.currentRoute)
  }

  getCurrentPath() {
    return this.currentRoute?.path || '/'
  }
}