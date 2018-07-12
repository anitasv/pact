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
            return this.delegate.then(onResolve, onReject)
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

module.exports = FastPact
