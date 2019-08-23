function isFunc(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
};

// TODO(anitvasu): This is non-standard :(
function runImmediate(fn) {
    setImmediate(fn)
}

class FastPact {

    static all(pacts) {
        return new FastPact((resolve, reject) => {
            let pending = 1
            const resultArr = []
    
            for (const p of pacts) {
                ++pending
    
                p.then((result) => {
                    resultArr.push(result)
                    pending--
                    if (pending == 0) {
                        resolve(resultArr)
                    }
                }, (err) => {
                    reject(err)
                })
            }
            pending--
            if (pending == 0) {
                resolve(resultArr)
            }
        });
    }

    static race(pacts) {
        return new FastPact((resolve, reject) => {
            for (const p of pacts) {
                p.then((result) => {
                    resolve(result)
                }, (err) => {
                    reject(err)
                })
            }
        })
    }

    static any(pacts) {
        return new FastPact((resolve, reject) => {
            let pending = 1
            let last_err = new Error("No promises")
    
            for (const p of pacts) {
                ++pending
    
                p.then((result) => {
                    resolve(result)
                }, (err) => {
                    last_err = err
                    pending--
                    if (pending == 0) {
                        reject(last_err)
                    }
                })
            }
            pending--
            if (pending == 0) {
                reject(last_err)
            }
        });
    }

    static resolve(arg) {
        if (arg instanceof FastPact) {
            return arg.deep()
        }
    
        if (arg instanceof Immediate || arg instanceof Failure) {
            return arg
        }
    
        const argType = typeof arg
        if (arg == null || (argType != 'function' && argType != 'object')) {
            return new Immediate(arg)
        }
    
        let argThen
        try {
            argThen = arg.then
        } catch(e) {
            return new Failure(e)
        }
        if (!isFunc(argThen)) {
            return new Immediate(arg)
        }
    
        return new FastPact((onResolve, onReject) => {
            argThen.call(arg, onResolve, onReject);
        });
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
                    (result) => this.setPromise(FastPact.resolve(result)), 
                    (err) => this.setPromise(new Failure(err)));
            } catch(e) {
                this.setPromise(new Failure(e));
            }
        }
        if (this.delegate != null) {
            return this.delegate;
        }
    }

    setPromise(delegate) {
        if (this.delegate != null) {
            return
        }
        if (delegate == this) {
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
            return this.delegate.deep()
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
    deep() {
        return this;
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
    deep() {
        return this;
    }
}


module.exports = FastPact
