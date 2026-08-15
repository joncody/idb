const indexed_db = (
    (globalThis !== undefined && globalThis.indexedDB !== undefined)
    ? globalThis.indexedDB
    : undefined
);

if (!indexed_db) {
    throw new Error("IndexedDB is not supported in this environment.");
}

function assert_name(name, label) {
    if (label === undefined) {
        label = "Name";
    }
    if (typeof name !== "string" || name === "") {
        throw new TypeError(label + " must be a non-empty string");
    }
}

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

function client(db) {
    function clear(table) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction([table], "readwrite").objectStore(table).clear()
        );
    }

    function close() {
        return db.close();
    }

    function count(table, query) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readonly"
            ).objectStore(table).count(query)
        );
    }

    function deleteRecord(table, key) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readwrite"
            ).objectStore(table).delete(key)
        );
    }

    function insert(table, value, key) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readwrite"
            ).objectStore(table).add(value, key)
        );
    }

    function select(table, key) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readonly"
            ).objectStore(table).get(key)
        );
    }

    function selectAll(table, query, limit_count) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readonly"
            ).objectStore(table).getAll(query, limit_count)
        );
    }

    function selectAllKeys(table, query, limit_count) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction(
                [table],
                "readonly"
            ).objectStore(table).getAllKeys(query, limit_count)
        );
    }

    function selectIndex(table, index, key) {
        assert_name(table, "Table name");
        return promisify(
            db.transaction([table], "readonly").objectStore(
                table
            ).index(index).get(key)
        );
    }

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

function upgrade(db) {
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

    function deleteStore(table) {
        assert_name(table, "Object store name");
        db.deleteObjectStore(table);
    }

    return Object.freeze({
        create,
        delete: deleteStore
    });
}

function deleteDatabase(name) {
    assert_name(name, "Database name");
    return promisify(indexed_db.deleteDatabase(name));
}

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

const idb = Object.freeze({
    delete: deleteDatabase,
    open: openDatabase
});

export default Object.freeze(idb);
