/**
 * @fileoverview Lightweight, functional Promise-based wrapper around
 * IndexedDB providing database creation, schema upgrades, and CRUD
 * operations.
 */

/**
 * Reference to the environment's IndexedDB factory.
 * @type {IDBFactory | undefined}
 */
const indexed_db = (
    (globalThis !== undefined && globalThis.indexedDB !== undefined)
    ? globalThis.indexedDB
    : undefined
);

if (!indexed_db) {
    throw new Error("IndexedDB is not supported in this environment.");
}

/**
 * Asserts that a name parameter is a non-empty string.
 *
 * @param {*} name - The value to validate.
 * @param {string} [label="Name"] - Descriptive label for error messages.
 * @throws {TypeError} If name is not a non-empty string.
 * @returns {void}
 */
function assert_name(name, label) {
    if (label === undefined) {
        label = "Name";
    }
    if (typeof name !== "string" || name === "") {
        throw new TypeError(label + " must be a non-empty string");
    }
}

/**
 * Wraps an IDBRequest in a Promise.
 *
 * @param {IDBRequest} request - The IDBRequest instance to promisify.
 * @returns {Promise<*>} Resolves with result or rejects with error.
 */
function promisify(request) {
    return new Promise(function (resolve, reject) {
        request.onsuccess = function () {
            resolve(request.result);
        };
        request.onerror = function () {
            reject(request.error);
        };
    });
}

/**
 * @typedef {Object} IDBClient
 * @property {(table: string) => Promise<undefined>} clear
 *     Removes all records from the specified object store.
 * @property {() => void} close
 *     Closes the active database connection.
 * @property {(table: string, query?: *) => Promise<number>} count
 *     Returns the total number of records matching query.
 * @property {(table: string, key: *) => Promise<undefined>} delete
 *     Deletes a record by its key from the object store.
 * @property {(table: string, value: *, key?: *) => Promise<*>} insert
 *     Adds a new record to the specified object store.
 * @property {(table: string, key: *) => Promise<*>} select
 *     Retrieves a single record by its key.
 * @property {function(string, *=, number=): Promise<*[]>} selectAll
 *     Retrieves all records matching query up to limit.
 * @property {function(string, *=, number=): Promise<*[]>} selectAllKeys
 *     Retrieves all record keys matching query up to limit.
 * @property {function(string, string, *): Promise<*>} selectIndex
 *     Retrieves a record via a specified index key.
 * @property {(table: string, value: *, key?: *) => Promise<*>} update
 *     Updates or inserts a record into the object store.
 */

/**
 * Creates a database client wrapping an IDBDatabase instance.
 *
 * @param {IDBDatabase} db - The active IDBDatabase connection.
 * @returns {Readonly<IDBClient>} The frozen database client.
 */
function client(db) {
    /**
     * Removes all records from the specified object store.
     *
     * @param {string} table - Object store name.
     * @returns {Promise<undefined>} Resolves when cleared.
     */
    function clear(table) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction([table], "readwrite").objectStore(table).clear()
        );
    }

    /**
     * Closes the active database connection.
     *
     * @returns {void}
     */
    function close() {
        return db.close();
    }

    /**
     * Counts records in an object store matching a query.
     *
     * @param {string} table - Object store name.
     * @param {*} [query] - Optional key or IDBKeyRange filter.
     * @returns {Promise<number>} Resolves with the record count.
     */
    function count(table, query) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readonly"
            ).objectStore(table).count(query)
        );
    }

    /**
     * Deletes a record by key from an object store.
     *
     * @param {string} table - Object store name.
     * @param {*} key - Key or IDBKeyRange of record to delete.
     * @returns {Promise<undefined>} Resolves when deleted.
     */
    function deleteRecord(table, key) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readwrite"
            ).objectStore(table).delete(key)
        );
    }

    /**
     * Inserts a new record into an object store.
     *
     * @param {string} table - Object store name.
     * @param {*} value - The value to store.
     * @param {*} [key] - Optional primary key for the record.
     * @returns {Promise<*>} Resolves with inserted record key.
     */
    function insert(table, value, key) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readwrite"
            ).objectStore(table).add(value, key)
        );
    }

    /**
     * Retrieves a single record by key from an object store.
     *
     * @param {string} table - Object store name.
     * @param {*} key - Key or IDBKeyRange to retrieve.
     * @returns {Promise<*>} Resolves with retrieved record.
     */
    function select(table, key) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readonly"
            ).objectStore(table).get(key)
        );
    }

    /**
     * Retrieves all records matching query up to limit_count.
     *
     * @param {string} table - Object store name.
     * @param {*} [query] - Optional key or IDBKeyRange filter.
     * @param {number} [limit_count] - Maximum records to return.
     * @returns {Promise<*[]>} Resolves with array of records.
     */
    function selectAll(table, query, limit_count) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readonly"
            ).objectStore(table).getAll(query, limit_count)
        );
    }

    /**
     * Retrieves all record keys matching query up to limit_count.
     *
     * @param {string} table - Object store name.
     * @param {*} [query] - Optional key or IDBKeyRange filter.
     * @param {number} [limit_count] - Maximum keys to return.
     * @returns {Promise<*[]>} Resolves with array of keys.
     */
    function selectAllKeys(table, query, limit_count) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readonly"
            ).objectStore(table).getAllKeys(query, limit_count)
        );
    }

    /**
     * Retrieves a record via an object store index.
     *
     * @param {string} table - Object store name.
     * @param {string} index - Index name.
     * @param {*} key - Key or IDBKeyRange to look up in index.
     * @returns {Promise<*>} Resolves with matching record.
     */
    function selectIndex(table, index, key) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction([table], "readonly").objectStore(
                table
            ).index(index).get(key)
        );
    }

    /**
     * Updates or inserts a record in an object store.
     *
     * @param {string} table - Object store name.
     * @param {*} value - The value to store.
     * @param {*} [key] - Optional primary key for the record.
     * @returns {Promise<*>} Resolves with record key.
     */
    function update(table, value, key) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readwrite"
            ).objectStore(table).put(value, key)
        );
    }

    return Object.freeze({
        clear,
        close,
        count,
        delete: deleteRecord,
        insert,
        select,
        selectAll,
        selectAllKeys,
        selectIndex,
        update
    });
}

/**
 * @typedef {Object} IDBUpgrade
 * @property {function(string, Object=, Object=): IDBObjectStore} create
 *     Creates a new object store with optional indexes.
 * @property {(table: string) => void} delete
 *     Deletes an existing object store by name.
 */

/**
 * Creates an upgrade helper for database schema migrations.
 *
 * @param {IDBDatabase} db - The IDBDatabase instance in upgrade mode.
 * @returns {Readonly<IDBUpgrade>} The frozen upgrade helper.
 */
function upgrade(db) {
    /**
     * Creates a new object store and its configured indexes.
     *
     * @param {string} table - Object store name.
     * @param {IDBObjectStoreParameters} [options] - Store options.
     * @param {Object.<string, Array>} [schema] - Index definitions.
     * @returns {IDBObjectStore} The created object store.
     */
    function create(table, options, schema) {
        assert_name(table, "Object store name");
        const store = db.createObjectStore(table, options);
        if (schema !== undefined && schema !== null) {
            Object.keys(schema).forEach(function (key) {
                const index_args = [key].concat(schema[key]);
                store.createIndex(...index_args);
            });
        }
        return store;
    }

    /**
     * Deletes an object store by name.
     *
     * @param {string} table - Object store name to delete.
     * @returns {void}
     */
    function deleteStore(table) {
        assert_name(table, "Object store name");
        db.deleteObjectStore(table);
    }

    return Object.freeze({
        create,
        delete: deleteStore
    });
}

/**
 * Deletes an IndexedDB database by name.
 *
 * @param {string} name - The name of the database to delete.
 * @returns {Promise<undefined>} Resolves when deleted.
 */
function deleteDatabase(name) {
    assert_name(name, "Database name");
    return promisify(indexed_db.deleteDatabase(name));
}

/**
 * Opens an IndexedDB database with optional version and upgrade callback.
 *
 * @param {string} name - The database name.
 * @param {number|Function} [version=1] - Database version or upgrade fn.
 * @param {function(IDBVersionChangeEvent, IDBUpgrade): void} [fn]
 *     Optional callback invoked on database upgrade.
 * @returns {Promise<IDBClient>} Resolves with database client.
 */
function openDatabase(name, version, fn) {
    if (typeof version === "function") {
        fn = version;
        version = 1;
    }
    if (version === undefined) {
        version = 1;
    }
    if (fn === undefined) {
        fn = function () {
            return undefined;
        };
    }
    assert_name(name, "Database name");
    const request = indexed_db.open(name, version);

    return new Promise(function (resolve, reject) {
        request.onerror = function (e) {
            reject(e);
        };
        request.onsuccess = function (e) {
            resolve(client(e.target.result));
        };
        request.onupgradeneeded = function (e) {
            const db = e.target.result;
            db.onerror = function (err) {
                reject(err);
            };
            try {
                fn(e, upgrade(db));
            } catch (err) {
                reject(err);
            }
        };
    });
}

/**
 * Main interface for IndexedDB operations.
 * @type {Readonly<Object>}
 */
const idb = Object.freeze({
    delete: deleteDatabase,
    open: openDatabase
});

export default Object.freeze(idb);
