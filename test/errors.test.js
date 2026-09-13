import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ValidationError,
  errorPayload
} from '../src/orm/errors.js'

test('known errors expose safe structured payloads', () => {
  const payload = errorPayload(
    new ValidationError('Bad input', { field: 'name' }),
    'req-1'
  )

  assert.equal(payload.status, 400)
  assert.deepEqual(payload.body, {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Bad input',
      details: { field: 'name' },
      request_id: 'req-1'
    }
  })
})

test('unknown errors hide internal messages', () => {
  const payload = errorPayload(new Error('database password leaked'), 'req-2')

  assert.equal(payload.status, 500)
  assert.equal(payload.body.error.code, 'INTERNAL_ERROR')
  assert.equal(payload.body.error.message, 'Internal server error')
  assert.equal(payload.body.error.request_id, 'req-2')
})
