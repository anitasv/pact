const Pact = require("./index.js")

    
const promisesAplusTests = require("promises-aplus-tests");

promisesAplusTests({
    resolved: (value) => Pact.resolve(value),
    rejected: (reason) => Pact.reject(reason),
    deferred: () => {
        const promise = new Pact()
        return {
            resolve: (result) => promise.setResolve(result),
            reject: (err) => promise.setErr(err),
            promise: promise
        }
    }
}, function (err) {
    // All done; output is in the console. Or check `err` for number of failures.
});

