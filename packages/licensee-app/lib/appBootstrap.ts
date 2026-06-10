'use client'

const LAS_URL = process.env.NEXT_PUBLIC_LAS_URL || 'https://your-las-server.com'

export async function generateHardwareFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
  ]
  const str = components.join('|')
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

export async function clearAllUserData() {
  localStorage.clear()
  sessionStorage.clear()
  try {
    const databases = await window.indexedDB.databases()
    databases.forEach(db => {
      if (db.name) window.indexedDB.deleteDatabase(db.name)
    })
  } catch { /* ignore */ }
}

export async function revokeLocalLicense() {
  localStorage.removeItem('license_token')
  localStorage.removeItem('license_status')
}

export function showTerminationScreen(message: string) {
  document.body.innerHTML = `
    <div style="
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      background: #0f0f0f; 
      color: #fff; 
      font-family: system-ui, sans-serif; 
      text-align: center;
      padding: 20px;
    ">
      <div style="max-width: 480px;">
        <div style="font-size: 64px; margin-bottom: 16px;">🔒</div>
        <h1 style="color: #ef4444; font-size: 28px; margin-bottom: 16px; font-weight: 800; letter-spacing: -0.5px;">LICENSE TERMINATED</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #a1a1aa; margin-bottom: 24px;">${message}</p>
        <div style="border-top: 1px solid #27272a; padding-top: 24px; font-size: 13px; color: #71717a;">
          Contact brand support to resolve this issue.<br/>
          All local data has been securely erased.
        </div>
      </div>
    </div>
  `
}

export async function bootstrapApplication() {
  const licenseToken = localStorage.getItem('license_token')
  const hardwareFingerprint = await generateHardwareFingerprint()

  try {
    const response = await fetch(`${LAS_URL}/api/license-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        licenseToken, 
        hardwareFingerprint,
        appVersion: '2.0.0'
      }),
    })

    const status = await response.json()

    // Store for component access
    localStorage.setItem('license_status', JSON.stringify(status))

    if (status.killSwitch || (status.valid === false && status.action === 'TERMINATE_IMMEDIATELY')) {
      await clearAllUserData()
      await revokeLocalLicense()
      showTerminationScreen(status.reason || 'Your license has been revoked. Contact support.')
      throw new Error('KILL_SWITCH_ACTIVATED')
    }

    // Set global split rates for payment processing
    if (typeof window !== 'undefined') {
      (window as any).__ROYALTY_SPLIT = status.splitRate
    }

    return status
  } catch (error) {
    if (error instanceof Error && error.message === 'KILL_SWITCH_ACTIVATED') {
      throw error
    }
    // Network errors: don't kill immediately, but show warning
    console.error('License check failed:', error)
    const cached = localStorage.getItem('license_status')
    if (cached) {
      return JSON.parse(cached)
    }
    return { valid: false, offline: true, warning: 'Cannot reach license server. Cached mode active.' }
  }
}
