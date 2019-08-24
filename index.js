function isFunc(fn) {
    return typeof fn === 'function'
}

// TODO(anitvasu): This is non-standard :(
function runImmediate(fn) {
    setImmediate(fn)
}


const PROMISE = 0;
const THENABLE = 1;
const PLAIN = 2;

function classify(arg) {
    if (arg instanceof FastPact) {
        return PROMISE;
    }

    if (arg instanceof Immediate || arg instanceof Failure) {
        return PROMISE;
    }

    const argType = typeof arg
    if (arg == null || (argType !== 'function' && argType !== 'object')) {
        return PLAIN;
    }

    let argThen = arg.then
    if (!isFunc(argThen)) {
        return PLAIN;
    }

    return argThen;
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
        try {
            const category = classify(arg);

            if (category == PLAIN) {
                return new Immediate(arg);
            } else if (category == PROMISE) {
                return arg;
            } else {
                return new FastPact((resolveFn, rejectFn) => {
                    category.call(arg, resolveFn, rejectFn);
                });
            }
        } catch(e) {
            return new Failure(e);
        }
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
                    (err) => this.setPromise(new Failure(err)),
                    (simple) => this.setPromise(new Immediate(simple)),
                    this);
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
            this.delegate.listen(action[0], action[1]);
        }
        this.listeners = []
    }

    listen(onResolve, onReject) {
        if (this.delegate == null) {
            this.listeners.push([onResolve, onReject]);
        } else {
            this.delegate.listen(onResolve, onReject);
        }
    }

    then(onResolve, onReject) {
        if (this.delegate == null) {
            return new FastPact((resolveFn, rejectFn, simpleFn, samePromise) => {

                const apply = (action, fallbackAction) => {
                    return arg => {
                        try {
                            if (!isFunc(action)) {
                                fallbackAction(arg)
                            } else {
                                const val = action(arg);
                                if (val == samePromise) {
                                    rejectFn(new TypeError());
                                }

                                const category = classify(val);
                                if (category == PLAIN) {
                                    simpleFn(val);
                                } else if (category == PROMISE) {
                                    val.listen(simpleFn, rejectFn)
                                } else {
                                    // category == val.then
                                    category.call(val, resolveFn, rejectFn);
                                }
                            }
                        } catch(e) {
                            rejectFn(e);
                        }
                    }
                }

                this.listeners.push([apply(onResolve, resolveFn), apply(onReject, rejectFn)])
            })
        } else {
            return this.delegate.then(onResolve, onReject)
        }
    }    
}

function next(action) {
    return new FastPact((resolveFn, rejectFn, simpleFn, samePromise) => {
        runImmediate(() => {
            try {
                const val = action();
                if (val == samePromise) {
                    rejectFn(new TypeError());
                }
                const category = classify(val);
                if (category == PLAIN) {
                    simpleFn(val);
                } else if (category == PROMISE) {
                    val.listen(simpleFn, rejectFn)
                } else {
                    // category == val.then
                    category.call(val, resolveFn, rejectFn);
                }
            } catch(err) {
                rejectFn(err);
            }
        })
    })
}

class Immediate {
    constructor(value) {
        this.value = value
    }
    listen(onResolve, onReject) {
        runImmediate(() => onResolve(this.value));
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
    listen(onResolve, onReject) {
        runImmediate(() => onReject(this.err));
    }
    then(onResolve, onReject) {
        if (!isFunc(onReject)) {
            return this
        }
        return next(() => onReject(this.err));
    }
}


module.exports = FastPact
