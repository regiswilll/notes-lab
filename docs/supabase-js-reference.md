Source: https://supabase.com/docs/reference/javascript/

# supabase-js reference: select, insert, update, delete, filters

Condensed from the Supabase JavaScript reference on 2026-11-24. Descriptions in quotes are from the
docs; code examples are reproduced in short form. Each section links to its full page. The examples use
the docs' sample tables (`characters`, `countries`, `instruments`, …), not this app's tables.

In this app, these calls belong only in `lib/db.ts` (see CLAUDE.md).

---

## select

Source: https://supabase.com/docs/reference/javascript/select

"Perform a SELECT query on the table or view."

**Parameters**
- `columns` (optional): the columns to retrieve, separated by commas. Rename a column with `customName:columnName`.
- `options` (optional): named parameters, e.g. `count`, `head`.

**Examples**

```ts
// Getting your data
const { data, error } = await supabase.from('characters').select()

// Selecting specific columns
const { data, error } = await supabase.from('characters').select('name')

// Query referenced tables
const { data, error } = await supabase
  .from('orchestral_sections')
  .select('name, instruments (name)')

// Query referenced tables whose names contain spaces
const { data, error } = await supabase
  .from('orchestral sections')
  .select('name, "musical instruments" (name)')

// Query referenced tables through a join table
const { data, error } = await supabase
  .from('users')
  .select('name, teams (name)')

// Query the same referenced table multiple times
const { data, error } = await supabase
  .from('messages')
  .select('content, from:sender_id(name), to:receiver_id(name)')
// Typed form: from:users!messages_sender_id_fkey(name), to:users!messages_receiver_id_fkey(name)

// Filtering through referenced tables
const { data, error } = await supabase
  .from('instruments')
  .select('name, orchestral_sections(*)')
  .eq('orchestral_sections.name', 'percussion')

// Querying a referenced table with count
const { data, error } = await supabase
  .from('orchestral_sections')
  .select('*, instruments(count)')

// Querying with count option (head: true returns only the count, no rows)
const { count, error } = await supabase
  .from('characters')
  .select('*', { count: 'exact', head: true })

// Querying JSON data
const { data, error } = await supabase
  .from('users')
  .select('id, name, address->city')

// Inner join on referenced tables (only rows that have a match)
const { data, error } = await supabase
  .from('instruments')
  .select('name, orchestral_sections!inner(name)')
  .eq('orchestral_sections.name', 'woodwinds')
  .limit(1)

// Switching schemas per query
const { data, error } = await supabase.schema('myschema').from('mytable').select()
```

---

## insert

Source: https://supabase.com/docs/reference/javascript/insert

"Perform an INSERT into the table or view."
"By default, inserted rows are not returned. To return it, chain the call with `.select()`."

**Parameters**
- `values` (required): an object inserts one row; an array of objects inserts many rows.
- `options`: named parameters.

**Examples**

```ts
// Create a record
const { error } = await supabase
  .from('countries')
  .insert({ id: 1, name: 'Mordor' })

// Create a record and return it
const { data, error } = await supabase
  .from('countries')
  .insert({ id: 1, name: 'Mordor' })
  .select()

// Bulk create
const { error } = await supabase
  .from('countries')
  .insert([
    { id: 1, name: 'Mordor' },
    { id: 1, name: 'The Shire' },
  ])
// (Both rows use id 1, exactly as in the docs' example.)
```

---

## update

Source: https://supabase.com/docs/reference/javascript/update

"Perform an UPDATE on the table or view."
"By default, updated rows are not returned. To return it, chain the call with `.select()` after filters."

**Parameters**
- `values` (required): "The values to update with".
- `options`: named parameters.

Always add a filter (e.g. `.eq('id', …)`), or the update applies to every row the policies allow.

**Examples**

```ts
// Updating your data
const { error } = await supabase
  .from('instruments')
  .update({ name: 'piano' })
  .eq('id', 1)

// Update a record and return it
const { data, error } = await supabase
  .from('instruments')
  .update({ name: 'piano' })
  .eq('id', 1)
  .select()

// Updating JSON data
const { data, error } = await supabase
  .from('users')
  .update({ address: { street: 'Melrose Place', postcode: 90210 } })
  .eq('address->postcode', 90210)
  .select()
```

---

## delete

Source: https://supabase.com/docs/reference/javascript/delete

"Perform a DELETE on the table or view."
"By default, deleted rows are not returned. To return it, chain the call with `.select()` after filters."

**Parameters**
- `options`: named parameters. (There is no `values` parameter; choose the rows with filters.)

Always add a filter, or the delete applies to every row the policies allow.

**Examples**

```ts
// Delete a single record
const response = await supabase
  .from('countries')
  .delete()
  .eq('id', 1)

// Delete a record and return it
const { data, error } = await supabase
  .from('countries')
  .delete()
  .eq('id', 1)
  .select()

// Delete multiple records
const response = await supabase
  .from('countries')
  .delete()
  .in('id', [1, 2, 3])
```

---

## Using filters

Source: https://supabase.com/docs/reference/javascript/using-filters

"Filters allow you to only return rows that match certain conditions."
Filters work with `select()`, `update()`, `upsert()` and `delete()`, and with Postgres functions that return a table.

**Filters go after `select()` / `update()` / `delete()`, not before.**

```ts
// Correct
const { data, error } = await supabase
  .from('instruments')
  .select('name, section_id')
  .eq('name', 'violin')

// Incorrect: .eq() before .select()
const { data, error } = await supabase
  .from('instruments')
  .eq('name', 'violin')
  .select('name, section_id')

// Chaining filters (all must match)
const { data, error } = await supabase
  .from('cities')
  .select('name, country_id')
  .gte('population', 1000)
  .lt('population', 10000)

// Conditional chaining: build the query step by step, then await it
const filterByName = null
const filterPopLow = 1000
const filterPopHigh = 10000

let query = supabase.from('cities').select('name, country_id')
if (filterByName)  { query = query.eq('name', filterByName) }
if (filterPopLow)  { query = query.gte('population', filterPopLow) }
if (filterPopHigh) { query = query.lt('population', filterPopHigh) }
const { data, error } = await query

// Filter by values within a JSON column
const { data, error } = await supabase
  .from('users')
  .select()
  .eq('address->postcode', 90210)

// Filter referenced tables
const { data, error } = await supabase
  .from('orchestral_sections')
  .select('name, instruments!inner (name)')
  .eq('instruments.name', 'flute')
```

### Filter methods

| Method | What it matches | Parameters | Example |
|---|---|---|---|
| [`eq`](https://supabase.com/docs/reference/javascript/using-filters-eq) | "Match only rows where `column` is equal to `value`." For NULL, use `.is()`. | `column`, `value` | `.select().eq('name', 'Leia')` |
| [`neq`](https://supabase.com/docs/reference/javascript/using-filters-neq) | "Match only rows where `column` is not equal to `value`." Rows where the column is NULL are **not** returned. | `column`, `value` | `.select().neq('name', 'Leia')` |
| [`gt`](https://supabase.com/docs/reference/javascript/using-filters-gt) | "Match only rows where `column` is greater than `value`." | `column`, `value` | `.select().gt('id', 2)` |
| [`lt`](https://supabase.com/docs/reference/javascript/using-filters-lt) | "Match only rows where `column` is less than `value`." | `column`, `value` | `.select().lt('id', 2)` |
| [`like`](https://supabase.com/docs/reference/javascript/using-filters-like) | "Match only rows where `column` matches `pattern` case-sensitively." | `column`, `pattern` | `.select().like('name', '%Lu%')` |
| [`ilike`](https://supabase.com/docs/reference/javascript/using-filters-ilike) | "Match only rows where `column` matches `pattern` case-insensitively." | `column`, `pattern` | `.select().ilike('name', '%lu%')` |
| [`is`](https://supabase.com/docs/reference/javascript/using-filters-is) | "Match only rows where `column` IS `value`." Mainly for NULL checks; on boolean columns `true`/`false` acts like `.eq()`. | `column`, `value` | `.select().is('name', null)` |
| [`in`](https://supabase.com/docs/reference/javascript/using-filters-in) | "Match only rows where `column` is included in the `values` array." | `column`, `values` | `.select().in('name', ['Leia', 'Han'])` |
| [`or`](https://supabase.com/docs/reference/javascript/using-filters-or) | "Match only rows which satisfy at least one of the filters." Written in PostgREST syntax; can't span multiple tables. | `filters`, `options` (`referencedTable`) | `.select('name').or('id.eq.2,name.eq.Han')` |
| [`not`](https://supabase.com/docs/reference/javascript/using-filters-not) | "Match only rows which doesn't satisfy the filter." Operator and value use PostgREST syntax. | `column`, `operator`, `value` | `.select().not('name', 'is', null)` |
| [`match`](https://supabase.com/docs/reference/javascript/using-filters-match) | "Match only rows where each column in `query` keys is equal to its associated value. Shorthand for multiple `.eq()`s." | `query` (object) | `.select('name').match({ id: 2, name: 'Leia' })` |

More `or` examples:

```ts
// Use or with and
.select('name').or('id.gt.3,and(id.eq.1,name.eq.Luke)')

// Use or on referenced tables
.from('orchestral_sections')
.select('name, instruments!inner(name)')
.or('section_id.eq.1,name.eq.guzheng', { referencedTable: 'instruments' })
```

**Safety note from the docs:** `.or()` and `.not()` pass their text straight to PostgREST. Never build
that text from user input (such as a search box) without cleaning it first.

Not copied here (see the index page): `gte`, `lte`, `contains`, `containedBy`, `overlaps`, `textSearch`,
`likeAllOf`, `likeAnyOf`, `ilikeAllOf`, `ilikeAnyOf`, `filter`, the range filters, and `upsert`.
