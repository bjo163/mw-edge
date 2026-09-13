import { ValidationError } from '../orm/index.js'

export function parseCollectionQuery(query = {}) {
  let domain = []
  let fields = []

  if (query.domain) {
    try {
      domain = JSON.parse(query.domain)
    } catch {
      throw new ValidationError('domain must be valid JSON')
    }

    if (!Array.isArray(domain)) {
      throw new ValidationError('domain must decode to an array')
    }
  }

  if (query.fields) {
    fields = String(query.fields)
      .split(',')
      .map(value => value.trim())
      .filter(Boolean)
  }

  const limit = query.limit === undefined ? 100 : Number(query.limit)
  const offset = query.offset === undefined ? 0 : Number(query.offset)
  const order = query.order === undefined ? undefined : String(query.order).trim()

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
    throw new ValidationError('limit must be an integer between 1 and 1000')
  }

  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new ValidationError('offset must be a non-negative integer')
  }

  return { domain, fields, limit, offset, order }
}

export function paginationMeta({ total, limit, offset, returned }) {
  return {
    total,
    limit,
    offset,
    returned,
    has_more: offset + returned < total,
    next_offset: offset + returned < total ? offset + returned : null
  }
}
