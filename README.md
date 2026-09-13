# MW Edge

Model-driven edge backend with an Odoo-inspired ORM for Cloudflare Workers and D1.

## MVP

- Hono on Cloudflare Workers
- Cloudflare D1
- Drizzle as the SQL/query layer
- Odoo-style model registry
- `search`, `searchRead`, `browse`, `create`, `write`, `unlink`, `count`
- Basic Odoo-style domains
- `Many2one` metadata
- Auto REST endpoints
- RPC endpoint

## Setup

```bash
pnpm install
pnpm wrangler d1 create mw-edge-dev
```

Copy the returned D1 `database_id` into `wrangler.jsonc`.

Apply migrations locally:

```bash
pnpm db:migrate:local
pnpm dev
```

Apply migrations remotely and deploy:

```bash
pnpm db:migrate:remote
pnpm deploy
```

## Model API

```js
const Partner = env.model('res.partner')

const partner = await Partner.create({
  name: 'PT EXATEL',
  active: true
})

const records = await Partner.searchRead(
  [['active', '=', true]],
  ['id', 'name']
)

await partner.write({ active: false })
await partner.unlink()
```

## REST

```text
GET    /api/models
GET    /api/res.partner
GET    /api/res.partner/:id
POST   /api/res.partner
PATCH  /api/res.partner/:id
DELETE /api/res.partner/:id
```

Create a partner:

```bash
curl -X POST http://localhost:8787/api/res.partner \
  -H 'content-type: application/json' \
  -d '{"name":"PT EXATEL","email":"info@example.com"}'
```

## RPC

```text
POST /api/rpc
```

Example:

```json
{
  "model": "res.partner",
  "method": "search_read",
  "domain": [["active", "=", true]],
  "fields": ["id", "name", "email"]
}
```

## Current models

- `res.company`
- `res.partner`

## MVP boundaries

Not implemented yet:

- authentication
- ACL / record rules
- multi-tenant control plane
- project-per-D1 routing
- One2many / Many2many
- computed fields
- model inheritance
- cross-database relations
- realtime
- R2 storage

These are intentionally deferred until the model and query contracts are stable.

## Direction

MW Edge is intended to evolve into a model-driven, multi-tenant BaaS for the edge:

```text
Client
  ↓
Hono / REST / RPC
  ↓
MW ORM
  ↓
Storage Resolver
  ↓
Cloudflare D1
```

The first milestone is intentionally focused on getting the model contract, domain queries, CRUD semantics, and D1 runtime correct before adding the control plane.
