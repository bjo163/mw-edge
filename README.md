# MW Edge

**Model-driven, multi-tenant BaaS for the edge with an Odoo-inspired ORM.**

MW Edge is being built for Cloudflare Workers and D1 with a small, explicit core. The first goal is not to recreate all of Odoo or Supabase. The first goal is to make the model contract, query semantics, CRUD lifecycle, API surface, and D1 runtime correct and predictable.

> **Current stage:** Foundation / ORM MVP  
> **Primary runtime:** Cloudflare Workers  
> **Primary database:** Cloudflare D1  
> **HTTP layer:** Hono  
> **SQL/query layer:** Drizzle
> **Release gate:** GitHub Issue #1 — remote D1 + production deployment

---

## Architecture

```text
Client
  │
  ▼
Hono
  │
  ├── REST
  └── RPC
        │
        ▼
   MW Environment
        │
        ▼
   Model Registry
        │
        ▼
      MW ORM
        │
        ▼
     Drizzle
        │
        ▼
 Cloudflare D1
```

Long-term:

```text
                         MW Edge
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
       Database            Auth            Storage
          │                 │                 │
        MW ORM             JWT               R2
          │
   Storage Resolver
          │
   ┌──────┼───────────┐
   ▼      ▼           ▼
  D1   PostgreSQL   future adapters
```

---

# Roadmap

## Phase 0 — Repository & Runtime Foundation

Goal: a minimal Cloudflare-native project that runs locally and can be deployed without unnecessary infrastructure.

- [x] Create `mw-edge` repository
- [x] Use JavaScript ESM
- [x] Add Hono
- [x] Add Cloudflare Workers entrypoint
- [x] Add Wrangler configuration
- [x] Add D1 binding placeholder `MW_DB`
- [x] Add Drizzle ORM
- [x] Add Drizzle Kit
- [x] Add initial D1 migration
- [x] Add `pnpm` scripts
- [x] Add `.gitignore`
- [x] Add MIT license
- [x] Add health/root endpoint
- [ ] Create real Cloudflare D1 database
- [ ] Replace placeholder `database_id`
- [x] Verify local D1 migration
- [ ] Verify `wrangler dev`
- [ ] Verify remote D1 migration
- [ ] Verify production `wrangler deploy`
- [ ] Add separate dev/prod environment configuration
- [x] Add deterministic environment validation on startup

### Phase 0 Definition of Done

- [ ] Fresh clone can run with documented commands
- [x] Local database can be created from migrations
- [x] Worker boots without runtime errors
- [ ] Production deployment succeeds
- [x] Root endpoint returns runtime/version information

---

## Phase 1 — ORM Core Contract

Goal: establish the stable Odoo-inspired model API before adding platform features.

### 1.1 Model Registry

- [x] Add central `ModelRegistry`
- [x] Register model by static `_name`
- [x] Resolve model using `env.model(name)`
- [x] Reject duplicate model names
- [x] Reject unknown model names
- [x] List registered model names
- [x] Add `_description` metadata
- [x] Add immutable normalized model metadata
- [x] Validate model declaration during registry boot
- [x] Validate table binding during registry boot
- [x] Add registry introspection API
- [x] Add model metadata endpoint
- [x] Define reserved model names
- [x] Define reserved field names

Target API:

```js
const Partner = env.model('res.partner')
```

### 1.2 Fields

Currently declared:

- [x] `fields.Char()`
- [x] `fields.Text()`
- [x] `fields.Integer()`
- [x] `fields.Float()`
- [x] `fields.Boolean()`
- [x] `fields.DateTime()`
- [x] `fields.Selection()`
- [x] `fields.Many2one()`

Field behavior still required:

- [x] `required`
- [x] `default`
- [x] `readonly`
- [ ] `index`
- [ ] `unique`
- [ ] `help`
- [ ] `label/string`
- [x] value type validation
- [x] selection value validation
- [x] unknown field rejection
- [x] field normalization
- [x] automatic defaults before create
- [x] automatic write validation
- [x] automatic create validation
- [x] immutable `id`
- [x] immutable create timestamp
- [x] controlled update timestamp

Future fields:

- [ ] `Date`
- [ ] `Json`
- [ ] `Binary`
- [ ] `One2many`
- [ ] `Many2many`

Deferred until later:

- [ ] computed fields
- [ ] related fields
- [ ] inverse methods
- [ ] onchange semantics
- [ ] dependency graph

### 1.3 Base CRUD

Implemented:

- [x] `browse(id)`
- [x] `search(domain)`
- [x] `searchRead(domain, fields)`
- [x] `create(values)`
- [x] record `write(values)`
- [x] record `unlink()`
- [x] `count(domain)`
- [x] `limit`
- [x] `offset`

Required before ORM MVP is stable:

- [x] `read(fields)`
- [x] multi-record `write()`
- [x] multi-record `unlink()`
- [x] multi-create
- [x] explicit `exists()`
- [x] deterministic return contracts
- [x] consistent empty-result behavior
- [x] consistent ID coercion rules
- [x] validate values before SQL execution
- [x] reject writes to unknown fields
- [x] reject writes to protected fields
- [x] transaction helper
- [x] atomic multi-operation transaction
- [ ] lifecycle hooks

Potential lifecycle hooks:

```text
beforeCreate
afterCreate
beforeWrite
afterWrite
beforeUnlink
afterUnlink
```

### 1.4 Record / Recordset Semantics

Current MVP has a single `Record` wrapper.

- [x] Single-record wrapper
- [x] Record `write()`
- [x] Record `unlink()`
- [x] Record `toJSON()`
- [x] Introduce explicit `RecordSet`
- [x] Empty recordset
- [x] Single recordset
- [x] Multi-record recordset
- [x] `ids`
- [x] `first()`
- [x] `mapped()`
- [x] `filtered()`
- [x] `ensureOne()`
- [x] iteration contract
- [x] stable serialization contract

Do not copy Odoo magic blindly. Recordset behavior must remain explicit and edge-runtime friendly.

---

## Phase 2 — Domain Query Engine

Goal: support an Odoo-like domain syntax with deterministic translation to SQL.

Current supported operators:

- [x] `=`
- [x] `!=`
- [x] `>`
- [x] `>=`
- [x] `<`
- [x] `<=`
- [x] `like`
- [x] `ilike`
- [x] `not like`
- [x] `in`
- [x] implicit AND
- [x] prefix OR operator `|`
- [x] prefix AND operator `&`

Still required:

- [x] `not in`
- [x] `not ilike`
- [x] unary NOT `!`
- [x] `is null`
- [x] `is not null`
- [ ] boolean normalization
- [ ] date/datetime normalization
- [ ] field-aware value coercion
- [x] invalid operator diagnostics
- [x] invalid prefix-expression diagnostics
- [x] nested expression tests
- [x] empty `in` behavior
- [x] SQL parameter-safety tests
- [x] max domain complexity guard
- [ ] query complexity budget

Example:

```js
await Partner.searchRead(
  [
    ['active', '=', true],
    '|',
    ['name', 'ilike', 'EXATEL'],
    ['email', 'ilike', '@exatel']
  ],
  ['id', 'name', 'email']
)
```

Before declaring compatibility, domain behavior must be covered by automated tests rather than assumed to match Odoo.

---

## Phase 3 — Relations

Goal: make relational models useful without creating cross-database complexity too early.

### 3.1 Many2one

Current state:

- [x] `Many2one` field metadata
- [x] D1 foreign key example for `res.partner.company_id`
- [x] verify comodel exists at registry boot
- [x] validate referenced ID
- [ ] relation-aware serialization
- [ ] optional relation expansion
- [ ] relation field selection
- [ ] relation-aware domain queries
- [ ] relation deletion policy
- [x] clear nullability behavior

Example target:

```js
const Partner = env.model('res.partner')

const partner = await Partner.browse(1)

await partner.read([
  'id',
  'name',
  'company_id'
])
```

### 3.2 One2many

- [ ] field declaration
- [ ] inverse-field validation
- [ ] lazy relation lookup
- [ ] relation serialization
- [x] pagination
- [ ] nested reads

### 3.3 Many2many

- [ ] field declaration
- [ ] junction-table convention
- [ ] automatic junction metadata
- [ ] add relation
- [ ] remove relation
- [ ] replace relations
- [ ] relation query support

### 3.4 Explicitly Deferred

- [ ] cross-D1 relational joins
- [ ] distributed foreign keys
- [ ] automatic cross-database transactions

For the first stable release, strongly related models should live in the same project database.

---

## Phase 4 — API Layer

Goal: generate safe REST and RPC access from registered models.

### 4.1 REST

Already available:

- [x] `GET /api/models`
- [x] `GET /api/:model`
- [x] `GET /api/:model/:id`
- [x] `POST /api/:model`
- [x] `PATCH /api/:model/:id`
- [x] `DELETE /api/:model/:id`

Required:

- [x] query-string domain support
- [x] field selection
- [x] limit
- [x] offset
- [x] ordering
- [x] total count
- [x] pagination metadata
- [x] standardized error envelope
- [ ] standardized success envelope decision
- [x] request body validation
- [ ] response serialization layer
- [x] maximum page size
- [x] maximum request body size
- [x] safe model exposure policy
- [ ] safe field exposure policy
- [ ] API versioning strategy

### 4.2 RPC

Already available:

- [x] `POST /api/rpc`
- [x] `search`
- [x] `search_read`
- [x] `browse`
- [x] `create`
- [x] `create_many`
- [x] `write`
- [x] `unlink`
- [x] `count`

Required:

- [x] normalized method names
- [x] strict method allowlist
- [x] per-model method exposure
- [ ] custom model methods
- [ ] model-level RPC methods
- [ ] record-level RPC methods
- [x] structured validation errors
- [x] method introspection
- [ ] API versioning

### 4.3 Error Contract

- [x] define error codes
- [x] distinguish validation errors
- [x] distinguish authorization errors
- [x] distinguish missing model
- [x] distinguish missing record
- [ ] distinguish conflict/unique violation
- [x] hide internal SQL/runtime details
- [x] attach request ID
- [x] structured logs

---

## Phase 5 — Testing, Quality & CI

Goal: no ORM semantics should rely on manual testing.

### Unit Tests

- [x] registry tests
- [x] field declaration tests
- [x] field validation tests
- [x] domain compiler tests
- [ ] CRUD tests
- [x] record tests
- [x] relation tests
- [x] error contract tests

### Integration Tests

- [x] local D1 migration test
- [x] Worker request test
- [x] REST CRUD test
- [x] RPC CRUD test
- [x] transaction test
- [x] foreign-key behavior test
- [x] pagination test

### Quality

- [x] ESLint
- [x] formatter
- [x] dependency audit
- [ ] dead-code check
- [ ] duplicate-code check
- [ ] bundle-size tracking
- [ ] runtime compatibility check
- [x] migration consistency check

### GitHub Actions

- [x] install
- [x] lint
- [x] unit tests
- [x] integration tests
- [x] build/runtime validation
- [x] dependency audit
- [x] migration validation
- [ ] branch protection
- [ ] required checks before merge

---


## Verified MVP Evidence

The current CI suite now proves the following against the Cloudflare Workers runtime and a local D1 database:

- [x] Worker module boots under workerd
- [x] repository migrations apply successfully
- [x] migrations are idempotent
- [x] registry/model metadata boot successfully
- [x] REST CRUD persists to D1
- [x] RPC CRUD persists to D1
- [x] Many2one references are validated before persistence
- [x] D1 foreign keys reject invalid raw writes
- [x] nullable Many2one values persist as `null`
- [x] D1 atomic batches roll back on failure
- [x] collection ordering is deterministic
- [x] empty collection responses are deterministic
- [x] malformed/oversized JSON fails closed
- [x] domain values remain SQL-parameterized
- [x] migration columns and foreign keys match the expected runtime schema

# MVP 0.1 Release Gate

**MW Edge 0.1 should not be called complete until all items below pass.**

### Runtime

- [x] local Worker boots
- [ ] production Worker deploys
- [x] local D1 works
- [ ] remote D1 works
- [x] migrations are repeatable

### ORM

- [x] model registry validated
- [x] field validation implemented
- [x] defaults implemented
- [x] required fields implemented
- [ ] CRUD contract stable
- [ ] record/recordset contract stable
- [x] domain compiler tested
- [x] Many2one usable end-to-end

### API

- [x] REST CRUD tested
- [x] RPC CRUD tested
- [x] input validation
- [x] output serialization
- [x] consistent errors
- [x] pagination
- [x] request IDs

### Quality

- [x] automated tests
- [x] CI green
- [x] no critical dependency vulnerabilities
- [ ] README setup verified from clean clone
- [ ] example app works

---

# Phase 6 — Security & Authentication

This starts **after the ORM MVP contract is stable**.

Goal: convert the ORM-backed API into a safe backend platform.

### Identity

- [ ] `auth.user`
- [ ] password hashing strategy
- [ ] session model
- [ ] JWT access token
- [ ] refresh token
- [ ] API keys
- [ ] API key hashing
- [ ] API key scopes
- [ ] key rotation
- [ ] logout/revocation

### Authorization

Inspired by useful Odoo concepts, without copying its full complexity:

- [ ] groups/roles
- [ ] model ACL
- [ ] create permission
- [ ] read permission
- [ ] write permission
- [ ] unlink permission
- [ ] record rules
- [ ] field-level protection
- [ ] system/admin bypass rules
- [ ] default-deny policy decision
- [ ] permission tests

### Security Baseline

- [ ] rate limiting
- [ ] request size limits
- [ ] brute-force protection
- [ ] secret handling
- [ ] CORS policy
- [ ] secure headers
- [ ] audit security events
- [ ] sensitive-field masking
- [ ] abuse protection

---

# Phase 7 — Multi-Tenant Control Plane

Goal: evolve MW Edge from an ORM/API into a real BaaS.

Recommended hierarchy:

```text
User
  │
  ▼
Organization
  │
  ▼
Project
  │
  ▼
Environment
  │
  ▼
Database
```

### 7.1 Control Database

Create a dedicated platform/control database separate from application data.

- [ ] `platform.user`
- [ ] `platform.organization`
- [ ] `platform.membership`
- [ ] `platform.project`
- [ ] `platform.environment`
- [ ] `platform.api_key`
- [ ] `platform.database`
- [ ] `platform.plan`
- [ ] `platform.usage`
- [ ] `platform.audit`

### 7.2 Organization

- [ ] create organization
- [ ] organization owner
- [ ] organization members
- [ ] roles
- [ ] invitations
- [ ] transfer ownership
- [ ] suspend organization

### 7.3 Project

- [ ] create project
- [ ] project slug
- [ ] project API key
- [ ] project settings
- [ ] dev environment
- [ ] production environment
- [ ] delete/archive project
- [ ] project status lifecycle

### 7.4 Tenant Resolution

Request flow target:

```text
Request
   │
   ▼
API key / JWT
   │
   ▼
Organization resolver
   │
   ▼
Project resolver
   │
   ▼
Environment resolver
   │
   ▼
Database resolver
   │
   ▼
MW ORM
```

Checklist:

- [ ] resolve API key
- [ ] resolve project
- [ ] resolve environment
- [ ] resolve database
- [ ] attach tenant context
- [ ] reject cross-tenant access
- [ ] tenant isolation tests

---

# Phase 8 — Database Provisioning & Storage Resolver

Goal: allow MW Edge to select storage without application code knowing the physical database.

Target:

```text
env.model('res.partner')
        │
        ▼
   Project Context
        │
        ▼
 Storage Resolver
        │
   ┌────┼─────┐
   ▼    ▼     ▼
  D1   D1   future
```

### Project-per-D1

Preferred first multi-tenant strategy:

```text
1 project environment = 1 D1 database
```

Checklist:

- [ ] database registry
- [ ] D1 provisioning
- [ ] D1 database ID persistence
- [ ] environment-to-D1 mapping
- [ ] migration on provision
- [ ] migration version tracking
- [ ] database health status
- [ ] database deletion lifecycle
- [ ] provisioning rollback
- [ ] provisioning idempotency
- [ ] quota enforcement

### Storage Policy

Later:

- [ ] `shared` strategy
- [ ] `dedicated` strategy
- [ ] `external` strategy
- [ ] PostgreSQL adapter
- [ ] storage adapter interface
- [ ] storage capability discovery

Do **not** implement model-per-database as the default. Models that frequently join or transact together should remain together.

---

# Phase 9 — BaaS Capabilities

Only after ORM, security, and multi-tenancy are stable.

## Storage

Cloudflare R2:

- [ ] buckets per project or namespace strategy
- [ ] upload API
- [ ] download API
- [ ] signed URLs
- [ ] metadata
- [ ] access policy
- [ ] size quota
- [ ] MIME validation

## Events

- [ ] model create event
- [ ] model write event
- [ ] model unlink event
- [ ] webhook subscriptions
- [ ] webhook signing
- [ ] retry
- [ ] dead-letter handling
- [ ] Cloudflare Queues integration

## Realtime

Potential Durable Objects layer:

- [ ] subscription protocol
- [ ] project channels
- [ ] model channels
- [ ] record channels
- [ ] authorization
- [ ] reconnect behavior
- [ ] fan-out strategy

## Functions

- [ ] project functions
- [ ] safe invocation
- [ ] environment variables
- [ ] secrets
- [ ] logs
- [ ] quotas

---

# Phase 10 — Developer Experience

Goal: make MW Edge usable without manually editing infrastructure files.

## CLI

Target command surface:

```text
mw init
mw dev
mw model create
mw migrate
mw project create
mw deploy
```

Checklist:

- [ ] `mw init`
- [ ] `mw dev`
- [ ] `mw model create`
- [ ] `mw migration create`
- [ ] `mw migrate`
- [ ] `mw project create`
- [ ] `mw project list`
- [ ] `mw deploy`
- [ ] `mw doctor`

## SDK

- [ ] JavaScript SDK
- [ ] authenticated client
- [ ] model client
- [ ] typed response option
- [x] pagination helpers
- [ ] auth helpers
- [ ] storage helpers

Possible future:

- [ ] TypeScript-first SDK
- [ ] Python SDK
- [ ] Rust SDK

---

# Phase 11 — Dashboard

Dashboard is **not part of the initial MVP**.

Eventually:

- [ ] login
- [ ] organization switcher
- [ ] project switcher
- [ ] environments
- [ ] model explorer
- [ ] record explorer
- [ ] SQL/query console
- [ ] API keys
- [ ] members
- [ ] usage
- [ ] logs
- [ ] storage browser
- [ ] webhook management

---

# Phase 12 — Advanced ORM Features

Do not start these before the basic contract is proven.

- [ ] model inheritance
- [ ] extension/inherit mechanism
- [ ] computed fields
- [ ] related fields
- [ ] constraints
- [ ] SQL constraints abstraction
- [ ] context
- [ ] company context
- [ ] sequence service
- [ ] soft delete
- [ ] audit fields
- [ ] change tracking
- [ ] model methods
- [ ] record methods
- [ ] batched prefetch
- [ ] relation prefetch
- [ ] query planner
- [ ] query budget
- [ ] query explain/debug mode

---

# Non-Goals for the Initial MVP

The following are intentionally **not** required for the first usable release:

- [ ] recreating the Odoo UI framework
- [ ] XML views
- [ ] Odoo module compatibility
- [ ] PostgreSQL parity
- [ ] distributed transactions
- [ ] model-per-D1 by default
- [ ] cross-D1 joins
- [ ] realtime
- [ ] R2 file storage
- [ ] billing
- [ ] marketplace
- [ ] visual workflow builder
- [ ] AI features
- [ ] Kubernetes
- [ ] Docker requirement
- [ ] VPS requirement

---

# Current Models

## `res.company`

Current fields:

- [x] `id`
- [x] `name`
- [x] `active`
- [x] `created_at`
- [x] `updated_at`

## `res.partner`

Current fields:

- [x] `id`
- [x] `name`
- [x] `email`
- [x] `active`
- [x] `company_id`
- [x] `created_at`
- [x] `updated_at`

---

# Current API

## REST

```text
GET    /api/models
GET    /api/models/:model
GET    /api/res.partner?fields=id,name&order=name%20desc&limit=20&offset=0
GET    /api/res.partner/:id
POST   /api/res.partner
PATCH  /api/res.partner/:id
DELETE /api/res.partner/:id
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

---

---

# Testing

MW Edge uses two complementary test layers:

```bash
pnpm test:unit
pnpm test:workers
pnpm test
```

- `test:unit` runs fast Node.js contract tests for registry, fields, domains, recordsets, request parsing, and error behavior.
- `test:workers` runs inside the Cloudflare Workers runtime with a real local D1 binding and applies the repository migrations before exercising HTTP routes.
- D1 migrations are applied twice in the test setup to verify idempotence.
- Integration coverage includes Worker boot, REST CRUD, RPC CRUD, Many2one validation, raw foreign-key enforcement, ordering, payload guards, and atomic batch rollback.

The test-only Worker configuration lives in `wrangler.test.jsonc`; production credentials are not required for the local integration suite.

---

# Setup

Install:

```bash
pnpm install
```

Create D1:

```bash
pnpm wrangler d1 create mw-edge-dev
```

Copy the returned `database_id` into `wrangler.jsonc`.

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

---

# Model API Example

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

await partner.write({
  active: false
})

await partner.unlink()
```

---

# REST Example

```bash
curl -X POST http://localhost:8787/api/res.partner \
  -H 'content-type: application/json' \
  -d '{"name":"PT EXATEL","email":"info@example.com"}'
```

---

# Engineering Principles

MW Edge should stay small and predictable.

- [x] Cloudflare-native first
- [x] model-driven API
- [x] Odoo-inspired naming and ergonomics
- [x] explicit model registry
- [x] D1-first MVP
- [ ] fail closed on authorization
- [x] validate at boundaries
- [ ] avoid hidden global state
- [ ] avoid hardcoded tenant/database IDs
- [x] avoid magic that cannot be introspected
- [ ] keep storage behind an adapter boundary
- [x] make migrations deterministic
- [ ] make every public contract testable
- [ ] keep control-plane data separate from project data
- [ ] prefer one project database over one database per model
- [ ] optimize only after measurement

---

# Release Sequence

The intended order is:

```text
0. Runtime Foundation
        ↓
1. ORM Core
        ↓
2. Domain Engine
        ↓
3. Relations
        ↓
4. REST / RPC
        ↓
5. Tests / CI
        ↓
      v0.1
        ↓
6. Auth / ACL
        ↓
7. Multi-Tenant Control Plane
        ↓
8. Project-per-D1 Provisioning
        ↓
      v0.2
        ↓
9. Storage / Events / Realtime
        ↓
10. CLI / SDK
        ↓
11. Dashboard
        ↓
     BaaS
```

The roadmap is intentionally ordered. Later phases should not be used to hide unfinished foundations in earlier phases.
