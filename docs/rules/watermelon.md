# VOLYUME — WATERMELONDB RULES

WatermelonDB is the source of truth on device.
Components read from it. Supabase is the cloud sync target only.
Never confuse these two roles.

---

## CORE ARCHITECTURE

Data flow is one direction only:
  Supabase (cloud) -> sync layer (src/sync/) -> WatermelonDB (device) -> UI

Components NEVER read from Supabase directly.
Components NEVER write to Supabase directly.
All reads: WatermelonDB observers and queries only.
All writes: WatermelonDB write transactions only. Sync layer handles upload.

---

## MUTATIONS — WRITE TRANSACTIONS ONLY

Every mutation must be inside a database.write() block.
Never mutate a record outside a writer.

Correct:
  await database.write(async () => {
    await record.update(r => {
      r.fieldName = newValue
    })
  })

Wrong — never do this:
  record.fieldName = newValue
  await record.save()

For creating records:
  await database.write(async () => {
    await database.get('table_name').create(record => {
      record.fieldA = valueA
      record.fieldB = valueB
      record.userId = currentUserId
    })
  })

For batch operations (prefer this for multiple related writes):
  await database.write(async () => {
    await database.batch(
      database.get('table_a').prepareCreate(r => { r.field = value }),
      database.get('table_b').prepareCreate(r => { r.field = value }),
    )
  })

---

## SCHEMA CHANGES

Every new table or column requires BOTH:
1. An update to schema.js with the new tableSchema or column
2. A new migration in migrations.js that matches the schema change

Never bump the schema version number without a migration.
Bumping the version without a migration destroys user data on upgrade.

Schema version must be incremented by exactly 1 per release.
Never skip version numbers.

New table template:
  tableSchema({
    name: 'table_name',
    columns: [
      { name: 'user_id', type: 'string', isIndexed: true },
      { name: 'field_name', type: 'string' },
      { name: 'numeric_field', type: 'number' },
      { name: 'boolean_field', type: 'boolean' },
      { name: 'created_at', type: 'number' },
      { name: 'updated_at', type: 'number' },
      { name: 'synced_at', type: 'number', isOptional: true },
    ]
  })

Migration template:
  addColumns({
    table: 'table_name',
    columns: [
      { name: 'new_column', type: 'string', isOptional: true }
    ]
  })

---

## QUERIES

Use the Q API for all queries. Never raw SQL.

Filtering:
  collection.query(Q.where('user_id', Q.eq(userId)))

Sorting:
  collection.query(Q.sortBy('created_at', Q.desc))

Relations:
  collection.query(Q.on('related_table', 'foreign_key', recordId))

Combined:
  collection.query(
    Q.where('user_id', Q.eq(userId)),
    Q.where('is_completed', true),
    Q.sortBy('created_at', Q.desc)
  )

---

## OBSERVERS — HOW COMPONENTS READ DATA

Components use observe() or observeWithColumns() for reactive data.
Never use a one-time fetch inside a component render cycle.

Hook pattern:
  export function useWorkouts(userId) {
    const [workouts, setWorkouts] = useState([])
    useEffect(() => {
      const subscription = database
        .get('workouts')
        .query(Q.where('user_id', Q.eq(userId)))
        .observe()
        .subscribe(setWorkouts)
      return () => subscription.unsubscribe()
    }, [userId])
    return workouts
  }

---

## MODELS

Every model class must:
- Extend Model
- Declare static table matching the schema table name
- Use @field, @text, @date, @readonly decorators correctly
- Include user_id as an indexed field on every user-data table
- Include created_at and updated_at as date fields

Model template:
  export class WorkoutModel extends Model {
    static table = 'workouts'

    @text('name') name
    @field('user_id') userId
    @field('is_completed') isCompleted
    @readonly @date('created_at') createdAt
    @date('updated_at') updatedAt
  }

---

## SYNC LAYER

Sync logic lives exclusively in src/sync/.
No component, hook, or service outside this directory calls Supabase directly.

The sync layer is responsible for:
- Pulling changes from Supabase into WatermelonDB
- Pushing local changes to Supabase
- Handling conflicts (last-write-wins by default)
- Tracking sync timestamps per table

Never modify the sync layer without reading the existing implementation first.
The sync architecture is established. Add to it, do not replace it.

---

## OFFLINE BEHAVIOUR

Every feature must work with no network connection.
WatermelonDB handles this automatically if the above patterns are followed.

When implementing a new feature, verify:
1. Data saves locally when offline
2. Data displays correctly when offline
3. Data syncs to Supabase when connection is restored
4. No UI shows a broken state when offline

Never show an error to the user because the network is unavailable.
Queue, cache, and sync. Never block.
