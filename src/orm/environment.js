import { drizzle } from 'drizzle-orm/d1'
import { ModelSet } from './model.js'

export function createEnvironment(binding, registry) {
  const db = drizzle(binding)
  const cache = new Map()

  return {
    db,
    registry,
    model(name) {
      if (!cache.has(name)) cache.set(name, new ModelSet(db, registry.get(name)))
      return cache.get(name)
    }
  }
}
