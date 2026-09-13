import { count as sqlCount, eq } from 'drizzle-orm'
import { compileDomain } from './domain.js'

function pick(record, fields) {
  if (!fields?.length) return record
  return Object.fromEntries(fields.filter(field => field in record).map(field => [field, record[field]]))
}

export class Record {
  constructor(model, data) {
    this.model = model
    this.data = data
    Object.assign(this, data)
  }

  async write(values) {
    const next = { ...values, updated_at: new Date() }
    await this.model.db.update(this.model.definition.table)
      .set(next)
      .where(eq(this.model.definition.table.id, this.id))
      .run()
    Object.assign(this, next)
    this.data = { ...this.data, ...next }
    return true
  }

  async unlink() {
    await this.model.db.delete(this.model.definition.table)
      .where(eq(this.model.definition.table.id, this.id))
      .run()
    return true
  }

  toJSON() {
    return this.data
  }
}

export class ModelSet {
  constructor(db, definition) {
    this.db = db
    this.definition = definition
  }

  async search(domain = [], options = {}) {
    const { limit = 100, offset = 0 } = options
    const where = compileDomain(this.definition.table, domain)
    let query = this.db.select().from(this.definition.table)
    if (where) query = query.where(where)
    const rows = await query.limit(limit).offset(offset).all()
    return rows.map(row => new Record(this, row))
  }

  async searchRead(domain = [], fields = [], options = {}) {
    const records = await this.search(domain, options)
    return records.map(record => pick(record.data, fields))
  }

  async browse(id) {
    const row = await this.db.select()
      .from(this.definition.table)
      .where(eq(this.definition.table.id, Number(id)))
      .get()
    return row ? new Record(this, row) : null
  }

  async create(values) {
    const rows = await this.db.insert(this.definition.table).values(values).returning().all()
    return new Record(this, rows[0])
  }

  async count(domain = []) {
    const where = compileDomain(this.definition.table, domain)
    let query = this.db.select({ value: sqlCount() }).from(this.definition.table)
    if (where) query = query.where(where)
    const row = await query.get()
    return row?.value ?? 0
  }
}
