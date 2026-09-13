import { and, eq, gt, gte, inArray, like, lt, lte, ne, notLike, or } from 'drizzle-orm'

function normalizeLike(value) {
  const text = String(value)
  return text.includes('%') ? text : `%${text}%`
}

function condition(table, term) {
  if (!Array.isArray(term) || term.length !== 3) {
    throw new Error('Domain term must be [field, operator, value]')
  }

  const [field, operator, value] = term
  const column = table[field]

  if (!column) throw new Error(`Unknown field: ${field}`)

  switch (operator) {
    case '=': return eq(column, value)
    case '!=': return ne(column, value)
    case '>': return gt(column, value)
    case '>=': return gte(column, value)
    case '<': return lt(column, value)
    case '<=': return lte(column, value)
    case 'like': return like(column, String(value))
    case 'ilike': return like(column, normalizeLike(value))
    case 'not like': return notLike(column, String(value))
    case 'in': return inArray(column, value)
    default: throw new Error(`Unsupported operator: ${operator}`)
  }
}

export function compileDomain(table, domain = []) {
  if (!domain?.length) return undefined

  const stack = []

  for (let i = domain.length - 1; i >= 0; i -= 1) {
    const token = domain[i]

    if (token === '|' || token === '&') {
      const left = stack.pop()
      const right = stack.pop()
      if (!left || !right) throw new Error('Invalid domain expression')
      stack.push(token === '|' ? or(left, right) : and(left, right))
      continue
    }

    if (token === '!') {
      throw new Error('Unary NOT is not implemented in MVP')
    }

    stack.push(condition(table, token))
  }

  return stack.length === 1 ? stack[0] : and(...stack.reverse())
}
