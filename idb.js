"use strict";

const global = (
    globalThis !== undefined
    ? globalThis
    : (
        window !== undefined
        ? window
        : this
    )
);

const indexedDB = global.indexedDB || global.mozIndexedDB || global.webkitIndexedDB || global.msIndexedDB;

if (!indexedDB) {
    throw new Error("IndexedDB not supported.");
}

function assertName(name, label = "Name") {
    if (typeof name !== "string" || name === "") {
        throw new TypeError(`${label} must be a non-empty string`);
    }
}

const promisify = function (request) {
    return new Promise(function (resolve, reject) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

function client(db) {
    return Object.freeze({
        clear: function (table) {
            assertName(table, "Table name");
            return promisify(db.transaction([table], "readwrite").objectStore(table).clear());
        },
        close: () => db.close(),
        count: function (table, query) {
            assertName(table, "Table name");
            return promisify(db.transaction([table], "readonly").objectStore(table).count(query));
        },
        delete: function (table, key) {
            assertName(table, "Table name");
            return promisify(db.transaction([table], "readwrite").objectStore(table).delete(key));
        },
        select: function (table, key) {
            assertName(table, "Table name");
            return promisify(db.transaction([table], "readonly").objectStore(table).get(key));
        },
        selectAll: function (table, query, count) {
            assertName(table, "Table name");
            return promisify(db.transaction([table], "readonly").objectStore(table).getAll(query, count));
        },
        selectAllKeys: function (table, query, count) {
            assertName(table, "Table name");
            return promisify(db.transaction([table], "readonly").objectStore(table).getAllKeys(query, count));
        },
        selectIndex: function (table, index, key) {
            assertName(table, "Table name");
            return promisify(db.transaction([table], "readonly").objectStore(table).index(index).get(key));
        },
        insert: function (table, value, key) {
            assertName(table, "Table name");
            const tx = db.transaction([table], "readwrite");
            const store = tx.objectStore(table);
            const request = (
                key === undefined
                ? store.add(value)
                : store.add(value, key)
            );
            return promisify(request);
        },
        update: function (table, value, key) {
            assertName(table, "Table name");
            const tx = db.transaction([table], "readwrite");
            const store = tx.objectStore(table);
            const request = (
                key === undefined
                ? store.put(value)
                : store.put(value, key)
            );
            return promisify(request);
        }
    });
}

function upgrade(db) {
    return Object.freeze({
        create: function (table, options, schema) {
            assertName(table, "Object store name");
            const store = db.createObjectStore(table, options);
            if (schema) {
                Object.keys(schema).forEach(function (key) {
                    schema[key].unshift(key);
                    store.createIndex(...schema[key]);
                });
            }
            return store;
        },
        delete: function (table) {
            assertName(table, "Object store name");
            db.deleteObjectStore(table);
        }
    });
}

const idb = {
    delete: function (name) {
        assertName(name, "Database name");
        return promisify(indexedDB.deleteDatabase(name));
    },
    open: function (name, version = 1, fn = function () {
        return;
    }) {
        if (typeof version === "function") {
            fn = version;
            version = 1;
        }
        assertName(name, "Database name");
        const request = indexedDB.open(name, version);
        return new Promise(function (resolve, reject) {
            request.onerror = (e) => reject(e);
            request.onsuccess = (e) => resolve(client(e.target.result));
            request.onupgradeneeded = function (e) {
                const db = e.target.result;
                db.onerror = (err) => reject(err);
                try {
                    fn(e, upgrade(db));
                } catch (err) {
                    reject(err);
                }
            };
        });
    }
};

export default Object.freeze(idb);
