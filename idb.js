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

const indexedDB = global.indexedDB
    || global.mozIndexedDB
    || global.webkitIndexedDB
    || global.msIndexedDB;

if (!indexedDB) {
    throw new Error("IndexedDB not supported.");
}

const promisify = function (request) {
    return new Promise(function (resolve, reject) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

function client(db) {
    return Object.freeze({
        select: function (table, key) {
            return promisify(db.transaction([table], "readonly").objectStore(table).get(key));
        },
        selectAll: function (table, query, count) {
            return promisify(db.transaction([table], "readonly").objectStore(table).getAll(query, count));
        },
        selectAllKeys: function (table, query, count) {
            return promisify(db.transaction([table], "readonly").objectStore(table).getAllKeys(query, count));
        },
        selectIndex: function (table, index, key) {
            return promisify(db.transaction([table], "readonly").objectStore(table).index(index).get(key));
        },
        delete: function (table, key) {
            return promisify(db.transaction([table], "readwrite").objectStore(table).delete(key));
        },
        insert: function (table, value, key) {
            return promisify(
                key === undefined
                ? db.transaction([table], "readwrite").objectStore(table).add(value)
                : db.transaction([table], "readwrite").objectStore(table).add(value, key)
            );
        },
        update: function (table, value, key) {
            return promisify(
                key === undefined
                ? db.transaction([table], "readwrite").objectStore(table).put(value)
                : db.transaction([table], "readwrite").objectStore(table).put(value, key)
            );
        },
        clear: function (table) {
            return promisify(db.transaction([table], "readwrite").objectStore(table).clear());
        },
        count: function (table, query) {
            return promisify(db.transaction([table], "readonly").objectStore(table).count(query));
        },
        close: () => db.close()
    });
}

function upgrade(db) {
    return Object.freeze({
        create: function (table, options, schema) {
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
            db.deleteObjectStore(table);
        }
    });
}

const idb = {
    open: function (name, version = 1, fn = () => {}) {
        if (typeof version === "function") {
            fn = version;
            version = 1;
        }
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
    },
    delete: function (name) {
        return promisify(indexedDB.deleteDatabase(name));
    }
};

export default Object.freeze(idb);
