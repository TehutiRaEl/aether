import { getDb } from './src/db'
import { generateLicense } from './src/license'

const db = getDb()

// Seed admin
const adminId = 'ADMIN_GENESIS'
db.prepare(`
  INSERT OR IGNORE INTO licensees (buyer_id, email, name, subscription_status)
  VALUES (?, ?, ?, ?)
`).run(adminId, 'admin@brand.com', 'Brand Administrator', 'active')

const adminToken = generateLicense(adminId, 'ORCHESTRATOR')
console.log('Admin token generated:', adminToken.slice(0, 20) + '...')
console.log('Store this securely in .admin-license.json')
