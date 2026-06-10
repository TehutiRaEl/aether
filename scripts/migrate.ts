import { getDb } from './src/db'

const db = getDb()
console.log('Database initialized at:', process.env.DATABASE_PATH || './data/authority.sqlite')
console.log('Tables ready.')
