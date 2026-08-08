import idb from "../../../src/idb.js";

function create_test_runner() {
    const results_container = document.getElementById("test-results");
    const summary_container = document.getElementById("summary");

    let current_group_body = null;
    let failed_assertions = 0;
    let passed_assertions = 0;
    let total_assertions = 0;

    function group(title) {
        if (current_group_body !== null) {
            console.groupEnd();
        }
        console.group(title);

        const group_el = document.createElement("div");
        const header_el = document.createElement("div");

        group_el.className = "test-group";
        header_el.className = "group-header";
        header_el.textContent = title;

        current_group_body = document.createElement("div");
        current_group_body.className = "group-body";

        group_el.appendChild(header_el);
        group_el.appendChild(current_group_body);
        results_container.appendChild(group_el);
    }

    function assert(condition, message) {
        total_assertions += 1;
        const entry = document.createElement("div");

        if (condition === true) {
            passed_assertions += 1;
            entry.className = "log-entry pass";
            entry.textContent = "[PASS] " + message;
            console.log("[PASS] " + message);
        } else {
            failed_assertions += 1;
            entry.className = "log-entry fail";
            entry.textContent = "[FAIL] " + message;
            console.error("[FAIL] " + message);
        }

        if (current_group_body !== null) {
            current_group_body.appendChild(entry);
        }
    }

    function assert_throws(fn, message) {
        total_assertions += 1;
        const entry = document.createElement("div");
        try {
            fn();
            failed_assertions += 1;
            entry.className = "log-entry fail";
            entry.textContent = "[FAIL] " + message + " (Did not throw)";
            console.error("[FAIL] " + message + " (Did not throw)");
        } catch (ignore) {
            passed_assertions += 1;
            entry.className = "log-entry pass";
            entry.textContent = "[PASS] " + message + " (Threw as expected)";
            console.log("[PASS] " + message + " (Threw as expected)");
        }

        if (current_group_body !== null) {
            current_group_body.appendChild(entry);
        }
    }

    function render_summary(start_time) {
        if (current_group_body !== null) {
            console.groupEnd();
        }

        const elapsed = performance.now() - start_time;
        const duration = Math.round(elapsed * 100) / 100;
        let status_class = "summary-fail";

        if (failed_assertions === 0) {
            status_class = "summary-pass";
        }

        const summary_text = (
            "Total Assertions: " +
            total_assertions +
            " | Passed: " +
            passed_assertions +
            " | Failed: " +
            failed_assertions +
            " | Execution Time: " +
            duration +
            " ms"
        );

        console.info(summary_text);

        summary_container.innerHTML = (
            "Total Assertions: <strong>" +
            total_assertions +
            "</strong> | Passed: <span class='" +
            status_class +
            "'>" +
            passed_assertions +
            "</span> | Failed: <span class='" +
            status_class +
            "'>" +
            failed_assertions +
            "</span> | Execution Time: <strong>" +
            duration +
            " ms</strong>"
        );
    }

    return Object.freeze({
        assert,
        assert_throws,
        group,
        render_summary
    });
}

async function run_all_tests() {
    const runner = create_test_runner();
    const start_time = performance.now();
    const db_name = "TestDB_Crockford";

    try {
        // ---------------------------------------------------------------------
        // GROUP 1: Database Open & Schema Upgrade
        // ---------------------------------------------------------------------
        runner.group("1. Database Open & Schema Upgrade");

        await idb.delete(db_name);

        const db = await idb.open(db_name, 1, function (ignore, up) {
            up.create(
                "users",
                {keyPath: "id"},
                {
                    byEmail: ["email", {unique: true}],
                    byName: ["name", {unique: false}]
                }
            );
        });

        runner.assert(
            typeof db.insert === "function",
            "idb.open() returns client instance with CRUD methods"
        );
        runner.assert(
            Object.isFrozen(db) === true,
            "Client instance is frozen with Object.freeze()"
        );

        // ---------------------------------------------------------------------
        // GROUP 2: CRUD - Insert & Select
        // ---------------------------------------------------------------------
        runner.group("2. CRUD - Insert & Select");

        const user1 = {
            email: "alice@example.com",
            id: 1,
            name: "Alice"
        };
        await db.insert("users", user1);

        const fetched = await db.select("users", 1);
        runner.assert(
            fetched !== undefined && fetched.email === "alice@example.com",
            "select() retrieves inserted record by primary key"
        );

        const fetched_by_email = await db.selectIndex(
            "users",
            "byEmail",
            "alice@example.com"
        );
        runner.assert(
            fetched_by_email !== undefined && fetched_by_email.id === 1,
            "selectIndex() retrieves record by secondary index"
        );

        // ---------------------------------------------------------------------
        // GROUP 3: CRUD - Update, Count & All Keys
        // ---------------------------------------------------------------------
        runner.group("3. CRUD - Update, Count & All Keys");

        const updated_user = {
            email: "alice@example.com",
            id: 1,
            name: "Alice Cooper"
        };
        await db.update("users", updated_user);

        const refetched = await db.select("users", 1);
        runner.assert(
            refetched.name === "Alice Cooper",
            "update() successfully updates existing record"
        );

        const user2 = {
            email: "bob@example.com",
            id: 2,
            name: "Bob"
        };
        await db.insert("users", user2);

        const total_count = await db.count("users");
        runner.assert(
            total_count === 2,
            "count() accurately returns total record count (2)"
        );

        const all_records = await db.selectAll("users");
        runner.assert(
            all_records.length === 2,
            "selectAll() returns array of all records"
        );

        const all_keys = await db.selectAllKeys("users");
        runner.assert(
            all_keys.length === 2 && all_keys[0] === 1,
            "selectAllKeys() returns array of primary keys"
        );

        // ---------------------------------------------------------------------
        // GROUP 4: CRUD - Delete, Clear & Close
        // ---------------------------------------------------------------------
        runner.group("4. CRUD - Delete, Clear & Close");

        await db.delete("users", 2);
        const count_after_delete = await db.count("users");
        runner.assert(
            count_after_delete === 1,
            "delete() removes single record by key"
        );

        await db.clear("users");
        const count_after_clear = await db.count("users");
        runner.assert(
            count_after_clear === 0,
            "clear() removes all records from table"
        );

        db.close();
        runner.assert(
            true,
            "close() closes database connection without error"
        );

        // ---------------------------------------------------------------------
        // GROUP 5: Database Deletion & Parameter Guards
        // ---------------------------------------------------------------------
        runner.group("5. Database Deletion & Parameter Guards");

        await idb.delete(db_name);
        runner.assert(
            true,
            "idb.delete() successfully deletes IndexedDB database"
        );

        runner.assert_throws(function () {
            idb.delete("");
        }, "idb.delete() with empty name string throws TypeError");

        runner.assert_throws(function () {
            idb.open(null);
        }, "idb.open() with null name throws TypeError");

    } catch (err) {
        runner.assert(
            false,
            "Unexpected test execution error: " + err.message
        );
    }

    runner.render_summary(start_time);
}

run_all_tests();
