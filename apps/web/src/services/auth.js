export class AuthService {
  constructor(supabase) {
    this.supabase = supabase
    this.user = null
    this.profile = null
  }

  async setUser(user) {
    this.user = user
    if (user) {
      const { data } = await this.supabase
        .from('users')
        .select('*, roles(name)')
        .eq('id', user.id)
        .single()
      this.profile = data
    }
  }

  async register(email, password, fullName, phone) {
    const { data: authData, error: authError } = await this.supabase.auth.signUp({ 
      email, 
      password,
      options: {
        emailRedirectTo: undefined
      }
    })
    if (authError) throw authError

    // Insert ke tabel users
    const { data: roleData } = await this.supabase
      .from('roles')
      .select('id')
      .eq('name', 'admin')
      .single()
    
    const { error: insertError } = await this.supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        full_name: fullName,
        phone: phone,
        role_id: roleData?.id,
        is_active: true
      })
    if (insertError) throw insertError

    await this.setUser(authData.user)
    return authData
  }

  async login(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await this.setUser(data.user)
    return data
  }

  async logout() {
    const { error } = await this.supabase.auth.signOut()
    if (error) throw error
    this.user = null
    this.profile = null
  }

  getRole() {
    return this.profile?.roles?.name || null
  }

  hasRole(...roles) {
    const role = this.getRole()
    return roles.includes(role)
  }

  isAuthenticated() {
    return !!this.user
  }
}