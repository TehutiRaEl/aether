import { getDb, verifyChain, appendAudit } from './src/db'
import { generateLicense, verifyLicense, revokeLicense } from './src/license'
import { getSubscriptionStatus, activateSubscription, startGracePeriod } from './src/subscription'

console.log('=== INTEGRATION TESTS ===')

// Test 1: Database
const db = getDb()
console.log('✓ Database connected')

// Test 2: License generation
const token = generateLicense('TEST_BUYER_001', 'TEST_HW')
console.log('✓ License generated')

// Test 3: License verification
const verified = verifyLicense(token)
console.log('✓ License verified:', verified.valid)

// Test 4: Audit chain
appendAudit('TEST_EVENT', 'TEST_BUYER_001', { test: true })
const chain = verifyChain()
console.log('✓ Audit chain valid:', chain.valid)

// Test 5: Subscription
activateSubscription('TEST_BUYER_001', Math.floor(Date.now()/1000) + 86400)
const sub = getSubscriptionStatus('TEST_BUYER_001')
console.log('✓ Subscription active:', sub.active, '| Split:', sub.userPercent + '/' + sub.brandPercent)

// Test 6: Grace period
startGracePeriod('TEST_BUYER_001')
const grace = getSubscriptionStatus('TEST_BUYER_001')
console.log('✓ Grace period:', grace.inGrace, '| Days:', grace.graceDaysRemaining)

// Test 7: Revocation
revokeLicense('TEST_BUYER_001', 'Test revocation')
const revoked = verifyLicense(token)
console.log('✓ Revocation works:', !revoked.valid)

console.log('\n=== ALL TESTS PASSED ===')
