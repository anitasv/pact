function isFunc(fn) {
    return typeof fn === 'function'
}

// TODO(anitvasu): This is non-standard :(
function runImmediate(fn) {
    setImmediate(fn)
}

function safeOnResolve(cb, context) {
    return isFunc(cb) ? cb : (result) => result
}

function safeOnReject(cb, context) {
    return isFunc(cb) ? cb : (err) => { throw err }
}

const NONE_SET = 0
const RESULT_SET = 1
const ERR_SET = 2
const FORWARD_SET = 3

class Wrapped {
    constructor() {
        this.listeners = []
        this.delegate = null
    }
    setDelegate(delegate) {
        if (this.delegate != null) {
            return
        }
        if (this.delegate == this) {
            return this.setDelegate(new Failure(new TypeError()))
        }
        this.delegate = delegate
        for (const action of this.listeners) {
            const nextDelegate = this.delegate.then(action[0], action[1])
            action[2].setDelegate(nextDelegate)
        }
        this.listeners = []
    }
    then(onResolve, onReject) {
        if (this.delegate == null) {
            const returned = new Wrapped()
            this.listeners.push([onResolve, onReject, returned])
            return returned
        } else {
            return this.delegate(onResolve, onReject)
        }
    }
    deep() {
        if (this.delegate != null) {
            if (typeof this.delegate.deep == 'function') {
                return this.delegate.deep()
            } else {
                return this.delegate
            }
        } else {
            return this
        }
    }
}

function crawl(maybePromise) {
    if (typeof maybePromise == 'object' || typeof maybePromise == 'function') {
        if (typeof maybePromise.then == 'function') {
            if (typeof maybePromise.deep == 'function') {
                return maybePromise.deep()
            } else {
                return maybePromise
            }
        }
    }
    return new Immediate(maybePromise)
}

class Immediate {
    constructor(value) {
        this.value = value
    }
    then(onResolve, onReject) {
        if (!isFunc(onResolve)) {
            return this
        }
        const returned = new Wrapped()
        runImmediate(() => {
            try {
                const next = onResolve(this.value)
                const promise = crawl(next)
                returned.setDelegate(promise)
            } catch (e) {
                returned.setDelegate(new Failure(e))
            }
        })
        return returned
    }
}

class Failure {
    constructor(err) {
        this.err = err
    }
    then(onResolve, onReject) {
        if (!isFunc(onReject)) {
            return this
        }

        const returned = new Wrapped()
        runImmediate(() => {
            try {
                const next = onReject(this.err)
                const promise = crawl(next)
                returned.setDelegate(promise)
            } catch (e) {
                returned.setDelegate(new Failure(e))
            }
        })
        return returned
    }
}

class FastPact {
    static resolve(result) {
        return crawl(result)
    }
    static reject(err) {
        return new Failure(err)
    }
    constructor() {
        this.delegate = new Wrapped()
    }
    setResolve(result) {
        this.delegate.setDelegate(crawl(result))
    }
    setErr(err) {
        this.delegate.setDelegate(new Failure(err))
    }
    then(onResolve, onReject) {
        return this.delegate.then(onResolve, onReject)
    }
}

class Pact {

    static resolve(result) {
        if (result instanceof Pact) {
            return result
        } else {
            const pact = new Pact()
            pact.setResolve(result)
            return pact
        }
    }

    static reject(err) {
        const pact = new Pact()
        pact.setErr(err)
        return pact
    }

    static all(pacts) {
        const pact = new Pact()
        let pending = 1
        const resultArr = []

        for (p in pacts) {
            ++pending

            p.then((result) => {
                resultArr.push(result)
                pending--
                if (pending == 0) {
                    pact.setResult(resultArr)
                }
            }, (err) => {
                pact.setErr(err)
            })
        }
        pending--
        if (pending == 0) {
            pact.setResult(resultArr)
        }

        return pact
    }

    static race(pacts) {
        const pact = new Pact()
        for (p in pacts) {
            p.then((result) => {
                pact.setResult(result)
            }, (err) => {
                pact.setErr(err)
            })
        }
        return pact
    }

    static any(pacts) {
        const pact = new Pact()
        let pending = 1
        const resultArr = []
        let last_err = new Error("No promises")

        for (p in pacts) {
            ++pending

            p.then((result) => {
                pact.setResult(result)
            }, (err) => {
                last_err = err
                pending--
                if (pending == 0) {
                    pact.setErr(last_err)
                }
            })
        }
        pending--
        if (pending == 0) {
            pact.setErr(last_err)
        }

        return pact
    }

    constructor(executor) {
        this.done = false
        this.state = NONE_SET
        this.result = null
        this.forwarding_pact = null
        this.err = null
        this.listeners = []
        if (executor) {
            executor((result) => this.setResolve(result), (err) => this.setErr(err))
        }
    }

    runCallback(action, returnedPact) {
        runImmediate(() => {
            try {
                const nextItem = action()
                returnedPact.setResolve(nextItem)
            } catch(e) {
                returnedPact.setErr(e)
            }
        })
    }

    runAllListeners() {
        this.listeners.forEach(cb => cb())
        this.listeners = []
    }

    setResolve(resultUnknown) {
        if (resultUnknown == this) {
            this.setErr(new TypeError())
        } else if (resultUnknown instanceof Pact) {
            this.setForwardingPact(resultUnknown)
        } else if (resultUnknown === null) {
            this.setResult(null)
        } else if (typeof resultUnknown == 'object' || typeof resultUnknown == 'function') {
            this.setForwardingThenable(resultUnknown)
        } else {
            this.setResult(resultUnknown)
        }
    }

    setInternal(state, cb) {
        if (this.done) {
            return
        }
        this.done = true
        this.state = state
        cb()
        this.runAllListeners()
    }

    setResult(result) {
        this.setInternal(RESULT_SET, () => { this.result = result})
    }

    setErr(err) {
        this.setInternal(ERR_SET, () => { this.err = err})
    }

    setForwardingPact(forwarding_pact) {
        this.setInternal(FORWARD_SET, () => { this.forwarding_pact = forwarding_pact})
    }

    setForwardingThenable(thenable) {
        try {
            const __then = thenable.then

            if (isFunc(__then)) {
                const pact = new Pact()
                this.setForwardingPact(pact)
        
                const resolvePromise = (y) => pact.setResolve(y)
                const rejectPromise = (r) => pact.setErr(r)

                runImmediate(() => {
                    try {
                        __then.call(thenable, resolvePromise, rejectPromise)
                    } catch(e) {
                        pact.setErr(e)
                    }
                })
            } else {
                this.setResult(thenable)
            }
        } catch(e) {
            this.setErr(e)
        }
    }

    makeListener(onResolve, onReject, returnedPact) {
        return () => {
            switch (this.state) {
                case NONE_SET:                 
                    throw Error("Invalid state")
                case RESULT_SET:
                    return this.runCallback(() => onResolve(this.result), returnedPact)
                case ERR_SET:
                    return this.runCallback(() => onReject(this.err), returnedPact)
                case FORWARD_SET:
                    return this.runCallback(() => this.forwarding_pact.then(onResolve, onReject), 
                    returnedPact)
            }
        };
    }

    then(onResolve, onReject) {
        const returnedPact = new Pact()
        const listener = this.makeListener(
            safeOnResolve(onResolve, returnedPact), 
            safeOnReject(onReject, returnedPact), 
            returnedPact)

        if  (!this.done) {
            this.listeners.push(listener)
        } else {
            listener()
        }
        return returnedPact
    }

    catch(onReject) {
        return this.then(null, onReject)
    }
}

module.exports = Pact
