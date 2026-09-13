import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_JSON_BODY_BYTES,
  readJsonObject
} from '../src/routes/body.js'

function context(body, headers = {}) {
  const request = new Request('https://mw-edge.test', {
    method: 'POST',
    headers,
    body
  })

  return {
    req: {
      header: name => request.headers.get(name),
      text: () => request.text()
    }
  }
}

test('readJsonObject accepts a JSON object', async () => {
  assert.deepEqual(
    await readJsonObject(context(JSON.stringify({ name: 'MW Edge' }))),
    { name: 'MW Edge' }
  )
})

test('readJsonObject rejects malformed and non-object JSON', async () => {
  await assert.rejects(
    () => readJsonObject(context('{')),
    /valid JSON/
  )

  await assert.rejects(
    () => readJsonObject(context('[]')),
    /must be an object/
  )
})

test('readJsonObject rejects oversized bodies', async () => {
  const oversized = JSON.stringify({ value: 'x'.repeat(MAX_JSON_BODY_BYTES) })

  await assert.rejects(
    () => readJsonObject(context(oversized)),
    error => error.code === 'PAYLOAD_TOO_LARGE' && error.status === 413
  )
})
