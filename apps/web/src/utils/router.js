export class Router {
  constructor(routes, auth) {
    this.routes = routes
    this.auth = auth
    this.currentRoute = null
    this.onRouteChange = null
  }

  navigate(path) {
    const route = this.routes[path]
    if (!route) {
      this.navigate('/')
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

    this.currentRoute = { path, ...route }
    window.location.hash = path
    this.onRouteChange?.(this.currentRoute)
  }

  getCurrentPath() {
    return this.currentRoute?.path || '/'
  }
}