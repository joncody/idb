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
- 🌐 **Universal browser support**: Works in all modern browsers.

---

## 📦 Installation

Place `src/idb.js` in your project and import it as an ES module:

```js
import idb from './src/idb.js';
```

---

## 🧠 Quick Examples

### 1. Open a Database & Define Schema

```js
import idb from './src/idb.js';

// Open (or create) a database and define its structure
const db = await idb.open("MyAppDB", 1, function (event, upgrade) {
    upgrade.create("users", { keyPath: "id" }, {
        // Indexes: { name: [keyPath, options] }
        byEmail: ["email", { unique: true }],
        byName:  ["name"]  // non-unique index
    });
});

console.log("✅ Database ready!");
```

### 2. CRUD Operations (All Promises!)

```js
// Insert
await db.insert("users", {
    email: "alice@example.com",
    id: 1,
    name: "Alice"
});

// Select by key
const user = await db.select("users", 1);

// Select via index
const byEmail = await db.selectIndex("users", "byEmail", "alice@example.com");

// Update
await db.update("users", {
    email: "alice@example.com",
    id: 1,
    name: "Alice Cooper"
});

// Count
const total = await db.count("users"); // → 1

// Delete
await db.delete("users", 1);

// Close when done
db.close();
```

### 3. Delete a Database

```js
await idb.delete("MyAppDB");
console.log("🗑️ Database deleted.");
```

---

## 📚 API Reference

### 🟢 Core Methods

| Method | Returns | Description |
|--------|--------|-------------|
| `idb.open(name, [version], [onUpgrade])` | `Promise<client>` | Opens a database. Defaults `version` to `1`. |
| `idb.delete(name)` | `Promise<void>` | Deletes the specified database. |

---

### 🗄️ Database Client (`client`)

Returned by `idb.open()`. All methods return **Promises**.

#### Data Methods

| Method | Description |
|--------|-------------|
| `clear(table)` | Delete all records in a table. |
| `close()` | Close the database connection. |
| `count(table, [query])` | Count records (optionally filtered). |
| `delete(table, key)` | Delete a record by key. |
| `insert(table, value, [key])` | Add a new record. |
| `select(table, key)` | Get a record by primary key. |
| `selectAll(table, [query], [count])` | Get all records. |
| `selectAllKeys(table, [query], [count])` | Get all primary keys. |
| `selectIndex(table, index, key)` | Get a record via a secondary index. |
| `update(table, value, [key])` | Upsert a record. |

---

### 🛠️ Upgrade Helper (`upgrade`)

Passed to the `onUpgrade` callback during `idb.open()`.

| Method | Description |
|--------|-------------|
| `create(table, options, [schema])` | Create an object store with optional schema indexes. |
| `delete(table)` | Delete an object store. |

---

## 🧪 Testing

This library includes a zero-dependency, comprehensive browser-based verification suite.

To run the test suite:

1. Serve the repository using any static web server (e.g., Nginx, Caddy, or Python's `http.server`).
2. Open `tests/index.html` in your browser (e.g., `http://localhost/tests/index.html`).
3. View results visually on the page or open Developer Tools (`F12` -> **Console**) to inspect grouped log outputs and execution metrics.

---

## 📄 License

See [LICENSE](./LICENSE) for details.
