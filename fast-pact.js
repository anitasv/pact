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

    constructor(executor) {
        this.listeners = []
        this.delegate = null
        if (executor != null) {
            try {
                executor(
                    (result) => this.setPromise(to_promise(result)), 
                    (err) => this.setPromise(new Failure(err)));
            } catch(e) {
                this.setPromise(new Failure(e));
            }
        }
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

    then(onResolve, onReject) {
        if (this.delegate == null) {
            const returned = new FastPact()
            this.listeners.push([onResolve, onReject, returned])
            return returned
        } else {
            return this.deep().then(onResolve, onReject)
        }
    }
    
    deep() {
        if (this.delegate != null) {
            if (this.delegate instanceof FastPact) {
                this.delegate = this.delegate.deep()
            }
            return this.delegate
        } else {
            return this
        }
    }
}

function next(action) {
    return new FastPact((resolve, reject) => {
        runImmediate(() => {
            try {
                resolve(action());
            } catch(err) {
                reject(err);
            }
        })
    })
}

class Immediate {
    constructor(value) {
        this.value = value
    }
    then(onResolve, onReject) {
        if (!isFunc(onResolve)) {
            return this
        }
        return next(() => onResolve(this.value));
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

        return next(() => onReject(this.err));
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

    return new FastPact((onResolve, onReject) => {
        argThen.call(arg, onResolve, onReject);
    });
}


module.exports = FastPact
