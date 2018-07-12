function isFunc(fn) {
    return typeof fn === 'function'
}

// TODO(anitvasu): This is non-standard :(
function runImmediate(fn) {
    setImmediate(fn)
}

class FastPact {

    static resolve(result) {
        return to_promise(result)
    }

    static reject(err) {
        return new Failure(err)
    }

    constructor() {
        this.listeners = []
        this.delegate = null
    }

    setPromise(delegate) {
        if (this.delegate != null) {
            return
        }
        if (delegate == this.deep()) {
            return this.setPromise(new Failure(new TypeError()))
        }
        this.delegate = delegate
        for (const action of this.listeners) {
            const nextDelegate = this.delegate.then(action[0], action[1])
            action[2].setPromise(nextDelegate)
        }
        this.listeners = []
    }

    setResolve(result) {
        this.setPromise(to_promise(result))
    }

    setErr(err) {
        this.setPromise(new Failure(err))
    }


    then(onResolve, onReject) {
        if (this.delegate == null) {
            const returned = new FastPact()
            this.listeners.push([onResolve, onReject, returned])
            return returned
        } else {
            return this.delegate.then(onResolve, onReject)
        }
    }
    deep() {
        if (this.delegate != null) {
            if (this.delegate instanceof FastPact) {
                return this.delegate.deep()
            } else {
                return this.delegate
            }
        } else {
            return this
        }
    }
}

class Immediate {
    constructor(value) {
        this.value = value
    }
    then(onResolve, onReject) {
        if (!isFunc(onResolve)) {
            return this
        }
        const returned = new FastPact()
        runImmediate(() => {
            try {
                const next = onResolve(this.value)
                const promise = to_promise(next)
                returned.setPromise(promise)
            } catch (e) {
                returned.setPromise(new Failure(e))
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

        const returned = new FastPact()
        runImmediate(() => {
            try {
                const next = onReject(this.err)
                const promise = to_promise(next)
                returned.setPromise(promise)
            } catch (e) {
                returned.setPromise(new Failure(e))
            }
        })
        return returned
    }
}

function to_promise(arg) {

    if (arg instanceof FastPact) {
        return arg.deep()
    }

    if (arg instanceof Immediate || arg instanceof Failure) {
        return arg
    }

    const argType = typeof arg
    if (argType != 'function' && argType != 'object') {
        return new Immediate(arg)
    }

    if (!arg) {
        return new Immediate(arg)
    }

    let argThen
    try {
        argThen = arg.then
    } catch(e) {
        return new Failure(e)
    }
    const argThenType = typeof argThen
    if (argThenType != 'function') {
        return new Immediate(arg)
    }

    const pact = new FastPact()

    class FastFoward {
        constructor() {
            this.done = false
        }
        onResolve(result) {
            if (this.done) {
                return
            }
            this.done = true

            if (result instanceof FastPact) {
                return pact.setPromise(result.deep())
            }
        
            if (result instanceof Immediate ||
                result instanceof Failure) {
                return pact.setPromise(result)
            }
                
            const resultType = typeof result
            if (resultType != 'function' && resultType != 'object') {
                return pact.setPromise(new Immediate(result))
            }

            if (!result) {
                return pact.setPromise(new Immediate(result))
            }
        
            let resultThen
            try {
                resultThen = result.then
            } catch(e) {
                return pact.setPromise(new Failure(e))
            }
        
            const resultThenType = typeof resultThen
            if (resultThenType != 'function') {
                return pact.setPromise(new Immediate(result))
            }

            fast_forward(result, resultThen)
        }
        onReject(err) {
            if (this.done) {
                return
            }
            this.done = true

            pact.setErr(err)
        }
    }

    function fast_forward(target, targetThen) {
        const ff = new FastFoward()
        const onResolve = (result) => ff.onResolve(result)
        const onReject = (err) => ff.onReject(err)

        try {
            targetThen.call(target, onResolve, onReject)
        } catch(e) {
            ff.onReject(e)
        }
    }
    
    fast_forward(arg, argThen)

    return pact
}


module.exports = FastPact
