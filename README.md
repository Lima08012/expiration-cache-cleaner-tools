# expiration-cache-cleaner-tools

Stores key-value pairs with a per-entry lifetime and provides a `sweep` method that removes every entry whose lifetime has elapsed.

```js
import { ExpirationCache } from './src/index.js';

// The constructor takes a clock function. Pass Date.now in production.
const cache = new ExpirationCache(Date.now);

cache.set('session', { user: 42 }, 30_000); // expires 30 seconds from now

cache.get('session'); // { user: 42 }

// Later, once some entries have aged out:
cache.sweep(); // number of entries removed
```

## Why this exists

A cache that only checks expiry on `get` never frees memory for keys that are read once and then forgotten. A cache that sweeps on every write pays a full scan for every insertion. This library keeps the two concerns separate: `get` is a cheap lookup that hides expired entries, and `sweep` is an explicit full scan the caller can run on whatever schedule matches the workload (a timer, a request boundary, a low-traffic moment). The trade-off is that expired entries remain in memory between sweeps, so `size` reports them and a long-running process must call `sweep` periodically.

## The awkward edge

Expiry is inclusive: an entry with a lifetime of `L` is expired as soon as `now() >= storedAt + L`. A lifetime of `0` therefore expires immediately, which is occasionally surprising but is the consistent reading of the rule. The clock is a constructor argument rather than a hard-coded `Date.now` so tests can advance time explicitly and never depend on wall-clock timing.
