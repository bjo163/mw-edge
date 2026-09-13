import {
  and,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  not,
  notInArray,
  notLike,
  or,
  sql
} from 'drizzle-orm'
import { ValidationError } from './errors.js'

const MAX_DOMAIN_TOKENS = 100

function normalizeLike(value) {
  const text = String(value)
  return text.includes('%') ? text : `%${text}%`
}

function arrayValue(operator, value) {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${operator} expects an array value`, { operator })
  }
  return value
}

function condition(table, term) {
  if (!Array.isArray(term) || term.length !== 3) {
    throw new ValidationError('Domain term must be [field, operator, value]')
  }

  const [field, operator, value] = term
  const column = table[field]

  if (!column) throw new ValidationError(`Unknown field: ${field}`, { field })

  switch (operator) {
    case '=':
      return value === null ? isNull(column) : eq(column, value)
    case '!=':
      return value === null ? isNotNull(column) : ne(column, value)
    case '>':
      return gt(column, value)
    case '>=':
      return gte(column, value)
    case '<':
      return lt(column, value)
    case '<=':
      return lte(column, value)
    case 'like':
      return like(column, String(value))
    case 'ilike':
      return like(column, normalizeLike(value))
    case 'not like':
      return notLike(column, String(value))
    case 'not ilike':
      return notLike(column, normalizeLike(value))
    case 'in': {
      const values = arrayValue(operator, value)
      return values.length === 0 ? sql`1 = 0` : inArray(column, values)
    }
    case 'not in': {
      const values = arrayValue(operator, value)
      return values.length === 0 ? sql`1 = 1` : notInArray(column, values)
    }
    case 'is null':
      return isNull(column)
    case 'is not null':
      return isNotNull(column)
    default:
      throw new ValidationError(`Unsupported operator: ${operator}`, { operator })
  }
}

export function compileDomain(table, domain = []) {
  if (!Array.isArray(domain)) throw new ValidationError('Domain must be an array')
  if (domain.length === 0) return undefined

  if (domain.length > MAX_DOMAIN_TOKENS) {
    throw new ValidationError('Domain is too complex', {
      max_tokens: MAX_DOMAIN_TOKENS,
      received: domain.length
    })
  }

  const stack = []

  for (let i = domain.length - 1; i >= 0; i -= 1) {
    const token = domain[i]

    if (token === '|' || token === '&') {
      const left = stack.pop()
      const right = stack.pop()

      if (!left || !right) {
        throw new ValidationError('Invalid domain expression')
      }

      stack.push(token === '|' ? or(left, right) : and(left, right))
      continue
    }

    if (token === '!') {
      const operand = stack.pop()
      if (!operand) throw new ValidationError('Invalid domain NOT expression')
      stack.push(not(operand))
      continue
    }

    stack.push(condition(table, token))
  }

  return stack.length === 1 ? stack[0] : and(...stack.reverse())
}
