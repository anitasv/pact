const Pact = require("./index.js")

const adapter = {
    resolved: (value) => Pact.resolve(value),
    rejected: (reason) => Pact.reject(reason),
    deferred: () => {
        let resolve = null;
        let reject = null;
        const promise = new Pact((resolveFn, rejectFn) => {
            resolve = resolveFn;
            reject = rejectFn;
        });
        return {
            resolve,
            reject,
            promise
        }
    }
}

const promisesAplusTests = require("promises-aplus-tests");

promisesAplusTests(adapter, function (err) {
    console.log("Done");
    // All done; output is in the console. Or check `err` for number of failures.
});
