import test from 'node:test'
import assert from 'node:assert/strict'

import { paginationMeta, parseCollectionQuery } from '../src/routes/query.js'

test('collection query parser handles domain, fields and pagination', () => {
  const result = parseCollectionQuery({
    domain: JSON.stringify([['active', '=', true]]),
    fields: 'id,name,email',
    limit: '20',
    offset: '40'
  })

  assert.deepEqual(result, {
    domain: [['active', '=', true]],
    fields: ['id', 'name', 'email'],
    limit: 20,
    offset: 40
  })
})

test('collection query parser fails closed on malformed input', () => {
  assert.throws(() => parseCollectionQuery({ domain: '{' }), /valid JSON/)
  assert.throws(() => parseCollectionQuery({ limit: '0' }), /between 1 and 1000/)
  assert.throws(() => parseCollectionQuery({ offset: '-1' }), /non-negative/)
})

test('pagination metadata is deterministic', () => {
  assert.deepEqual(
    paginationMeta({ total: 45, limit: 20, offset: 20, returned: 20 }),
    {
      total: 45,
      limit: 20,
      offset: 20,
      returned: 20,
      has_more: true,
      next_offset: 40
    }
  )

  assert.equal(
    paginationMeta({ total: 45, limit: 20, offset: 40, returned: 5 }).next_offset,
    null
  )
})
