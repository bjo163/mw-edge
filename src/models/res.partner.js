import { partners } from '../db/schema.js'
import { fields } from '../orm/index.js'

export class ResPartner {
  static _name = 'res.partner'
  static _description = 'Partner'
  static _api = {
    rest: true,
    rpc: ['search', 'search_read', 'count', 'browse', 'create', 'create_many', 'write', 'unlink']
  }
  static table = partners

  static fields = {
    name: fields.Char({ required: true }),
    email: fields.Char(),
    active: fields.Boolean({ default: true }),
    company_id: fields.Many2one('res.company')
  }
}
