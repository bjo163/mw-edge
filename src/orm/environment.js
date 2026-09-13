import { drizzle } from 'drizzle-orm/d1'
import { ValidationError } from './errors.js'
import { ModelSet } from './model.js'

export function createEnvironment(binding, registry) {
  if (!binding || typeof binding.prepare !== 'function' || typeof binding.batch !== 'function') {
    throw new ValidationError('MW_DB D1 binding is missing or invalid')
  }

  if (!registry || typeof registry.get !== 'function' || typeof registry.metadata !== 'function') {
    throw new ValidationError('Model registry is missing or invalid')
  }

  const db = drizzle(binding)
  const cache = new Map()

  const environment = {
    db,
    registry,

    statement(sql, ...params) {
      if (typeof sql !== 'string' || !sql.trim()) {
        throw new ValidationError('SQL statement must be a non-empty string')
      }

      const statement = binding.prepare(sql)
      return params.length ? statement.bind(...params) : statement
    },

    async atomic(statements) {
      if (!Array.isArray(statements) || statements.length === 0) {
        throw new ValidationError('atomic() expects at least one prepared statement')
      }

      return binding.batch(statements)
    },

    model(name) {
      if (!cache.has(name)) {
        cache.set(
          name,
          new ModelSet(
            db,
            registry.get(name),
            registry.metadata(name),
            relatedModel => environment.model(relatedModel)
          )
        )
      }

      return cache.get(name)
    }
  }

  return Object.freeze(environment)
}
