import { drizzle } from 'drizzle-orm/d1'
import { ValidationError } from './errors.js'
import { ModelSet } from './model.js'

export function createEnvironment(binding, registry) {
  if (!binding || typeof binding.prepare !== 'function') {
    throw new ValidationError('MW_DB D1 binding is missing or invalid')
  }

  if (!registry || typeof registry.get !== 'function' || typeof registry.metadata !== 'function') {
    throw new ValidationError('Model registry is missing or invalid')
  }

  const db = drizzle(binding)
  const cache = new Map()

  return Object.freeze({
    db,
    registry,
    model(name) {
      if (!cache.has(name)) {
        cache.set(name, new ModelSet(db, registry.get(name), registry.metadata(name)))
      }
      return cache.get(name)
    }
  })
}
