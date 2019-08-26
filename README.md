# pact
Promises Library


Fully Standards compliant (At least passes all tests): https://promisesaplus.com/


And implements a extra facility called Pact.any() which will return first non errored promise, unless all errored in the iterator. These are not well tested though. Pact.all(), Pact.race(), Pact.resolve(x), Pact.reject(e) work according to ECMA spec. 

I hope it is at least one of the smallest Promises library that passes all tests!

<a href="https://promisesaplus.com/">
    <img src="https://promisesaplus.com/assets/logo-small.png" alt="Promises/A+ logo"
         title="Promises/A+ 1.0 compliant" align="right" />
</a>

NEW: FastPact is now Pact!

Parallel benchmark: (Bluebird/bench parallel: Now beating native promises and native async await! )
`

file                                      time(ms)  memory(MB)
callbacks-baseline.js                          459       67.16
callbacks-suguru03-neo-async-parallel.js       466       82.82
promises-bluebird.js                           529      107.72
promises-bluebird-generator.js                 568       97.34
callbacks-caolan-async-parallel.js             637      117.09
promises-lvivski-davy.js                       710      161.83
promises-cujojs-when.js                        863      170.90
promises-pact.js                               987      216.21
promises-native-async-await.js                1231      243.39
generators-tj-co.js                           1261      244.01
promises-ecmascript6-native.js                1356      237.95
promises-tildeio-rsvp.js                      1534      340.98
promises-then-promise.js                      1889      303.84
promises-medikoo-deferred.js                  1913      356.30
promises-calvinmetcalf-lie.js                 2245      368.83
promises-dfilatov-vow.js                      3326      537.12
promises-obvious-kew.js                       3810      458.77
streamline-generators.js                      8255      973.62
streamline-callbacks.js                      14268     1175.07

`

`
file                                       time(ms)  memory(MB)
callbacks-baseline.js                           201       26.83
promises-bluebird-generator.js                  256       37.20
callbacks-suguru03-neo-async-waterfall.js       266       42.28
promises-bluebird.js                            290       45.38
callbacks-caolan-async-waterfall.js             296       45.27
promises-native-async-await.js                  318       51.44
promises-then-promise.js                        386       66.58
promises-cujojs-when.js                         392       63.68
promises-lvivski-davy.js                        407       88.82
promises-ecmascript6-native.js                  413       69.14
promises-tildeio-rsvp.js                        448       79.51
generators-tj-co.js                             454       57.65
promises-calvinmetcalf-lie.js                   599      134.32
promises-dfilatov-vow.js                        670      130.57
promises-pact.js                                757      129.89
streamline-generators.js                        897       91.92
promises-obvious-kew.js                         899      130.02
promises-medikoo-deferred.js                    963      130.71
observables-pozadi-kefir.js                    1011      161.87
streamline-callbacks.js                        1250      110.26
observables-Reactive-Extensions-RxJS.js        1635      241.07
observables-caolan-highland.js                 3829      457.68
promises-kriskowal-q.js                        4379      252.69
observables-baconjs-bacon.js.js                6367      690.79
`


