import { createQcLevelSchema } from '../lib/qc/validation'

function test(payload: any) {
  try {
    const parsed = createQcLevelSchema.parse(payload)
    console.log('VALID:', payload, '->', parsed)
  } catch (err: any) {
    console.log('INVALID:', payload)
    if (err?.errors) {
      console.log('ZOD ERRORS:', JSON.stringify(err.errors, null, 2))
    } else {
      console.log('ERROR:', err?.message || err)
    }
  }
}

console.log('Testing payloads against createQcLevelSchema')

const base = { testId: '00000000-0000-0000-0000-000000000000', level: 'L1' }

// Case 1: material explicitly null
test({ ...base, material: null })

// Case 2: material omitted (undefined)
test({ ...base })

// Case 3: material as empty string (should be allowed but maybe trimmed elsewhere)
test({ ...base, material: '' })

// Case 4: material as long string (valid)
test({ ...base, material: 'Control Material' })

console.log('Done')
