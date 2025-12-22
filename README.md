# `idb.js` – Promise-Based IndexedDB Wrapper

A **lightweight**, **Promise-native** wrapper for the browser’s IndexedDB API—**no events, no callbacks, no clutter**.

`idb.js` eliminates IndexedDB’s verbose transaction/request boilerplate with a clean, functional API. Every operation returns a Promise, making database code **simple, composable, and async/await–friendly**.

---

## ✅ Features

- ⚡ **Promise-based API**: All methods return Promises—no event listeners needed.
- 🧼 **Minimal & dependency-free**: Zero external dependencies; <1KB minified.
- 🧱 **Factory-based design**: No classes—just pure functions and frozen objects.
- 📦 **Schema management**: Declarative index creation during upgrades.
- 🔒 **Safe & immutable**: Returned client and upgrade objects are frozen.
- 🌐 **Universal browser support**: Works in all modern browsers (Chrome, Firefox, Safari, Edge).
- 🧪 **TypeScript-ready**: Clear, predictable method signatures.

---

## 📦 Installation

Just copy `idb.js` into your project.

Import as an ES module:

```js
import idb from './idb.js';
```

---

## 🧠 Quick Examples

### 1. Open a Database & Define Schema

```js
import idb from './idb.js';

// Open (or create) a database and define its structure
const db = await idb.open('MyAppDB', 1, (event, upgrade) => {
    upgrade.create('users', { keyPath: 'id' }, {
        // Indexes: { name: [keyPath, options] }
        byEmail: ['email', { unique: true }],
        byName:  ['name']  // non-unique index
    });
});

console.log('✅ Database ready!');
```

### 2. CRUD Operations (All Promises!)

```js
// Insert
await db.insert('users', { id: 1, name: 'Alice', email: 'alice@example.com' });

// Select by key
const user = await db.select('users', 1);

// Select via index
const byEmail = await db.selectIndex('users', 'byEmail', 'alice@example.com');

// Update
await db.update('users', { id: 1, name: 'Alice Cooper', email: 'alice@example.com' });

// Count
const total = await db.count('users'); // → 1

// Delete
await db.delete('users', 1);

// Close when done
db.close();
```

### 3. Delete a Database

```js
await idb.delete('MyAppDB');
console.log('🗑️ Database deleted.');
```

---

## 📚 API Reference

### 🟢 Core Methods

| Method | Returns | Description |
|--------|--------|-------------|
| `idb.open(name, [version], [onUpgrade])` | `Promise<client>` | Opens a database. If `version` is omitted, defaults to `1`. `onUpgrade` is called only if a version upgrade is needed. |
| `idb.delete(name)` | `Promise<void>` | Deletes the database with the given name. |

> 💡 You can omit `version` and pass only a function:  
> `idb.open('DB', (e, u) => { ... })` → version defaults to `1`.

---

### 🗄️ Database Client (`client`)

Returned by `idb.open()`. All methods return **Promises**.

#### Data Methods

| Method | Description |
|--------|-------------|
| `select(table, key)` | Get a record by primary key. |
| `selectAll(table, [query], [count])` | Get all records (optionally filtered by `query`, limited by `count`). |
| `selectAllKeys(table, [query], [count])` | Get all primary keys (same filtering). |
| `selectIndex(table, index, key)` | Get a record via a secondary index. |
| `insert(table, value, [key])` | Add a new record (`key` optional if `value` contains keyPath). |
| `update(table, value, [key])` | Upsert a record (adds if missing, updates if exists). |
| `delete(table, key)` | Delete a record by key. |
| `clear(table)` | Delete all records in a table. |
| `count(table, [query])` | Count records (optionally filtered). |
| `close()` | Close the database connection. |

> ⚠️ Each method creates its **own transaction**. For multi-operation transactions, you’d need to extend the API—but this keeps things simple and safe by default.

---

### 🛠️ Upgrade Helper (`upgrade`)

Passed to the `onUpgrade` callback during `idb.open()`.

| Method | Description |
|--------|-------------|
| `create(table, options, [schema])` | Create an object store. `schema` is an object like `{ indexName: [keyPath, options] }`. |
| `delete(table)` | Delete an object store (during upgrade only). |

#### Schema Format Example

```js
upgrade.create('products', { keyPath: 'id' }, {
    byCategory: ['category'],
    byPrice:    ['price', { unique: false }]
});
```

> 🔧 Under the hood, this calls `store.createIndex('byCategory', 'category')`, etc.

---

## 🧪 Error Handling

All operations **reject the Promise** on error:

```js
try {
    await db.insert('users', { id: 1 });
    await db.insert('users', { id: 1 }); // duplicate key → throws
} catch (err) {
    console.error('Failed:', err.message);
}
```

No global error events—errors flow naturally through Promise chains.

---

## 📄 License

See [LICENSE](./LICENSE) for details.

---
