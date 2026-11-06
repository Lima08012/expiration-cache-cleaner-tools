export class ExpirationCache {
  #entries = new Map();
  #now;

  /**
   * @param {() => number} now - A function returning the current time in milliseconds.
   *   Taking a clock as a constructor argument makes expiration deterministic and testable;
   *   tests pass a fake clock instead of sleeping.
   */
  constructor(now = Date.now) {
    this.#now = now;
  }

  /**
   * Store a value under `key` with a time-to-live of `lifetimeMs` milliseconds.
   * The entry expires when `now() >= storedAt + lifetimeMs`. A lifetime of 0 means
   * the entry is immediately expired.
   *
   * @param {string} key
   * @param {*} value
   * @param {number} lifetimeMs
   */
  set(key, value, lifetimeMs) {
    this.#entries.set(key, { value, storedAt: this.#now(), lifetimeMs });
  }

  /**
   * Return the value for `key` if it exists and has not expired, otherwise undefined.
   * Expired entries are left in place until `sweep` is called; this keeps `get` cheap
   * and lets the caller decide when to pay for cleanup.
   *
   * @param {string} key
   * @returns {*|undefined}
   */
  get(key) {
    const entry = this.#entries.get(key);
    if (entry === undefined) return undefined;
    if (this.#now() >= entry.storedAt + entry.lifetimeMs) return undefined;
    return entry.value;
  }

  /**
   * Remove every entry whose lifetime has elapsed. Returns the number of entries removed.
   *
   * @returns {number}
   */
  sweep() {
    const now = this.#now();
    let removed = 0;
    for (const [key, entry] of this.#entries) {
      if (now >= entry.storedAt + entry.lifetimeMs) {
        this.#entries.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * The number of entries currently stored, including expired-but-not-yet-swept ones.
   * @returns {number}
   */
  get size() {
    return this.#entries.size;
  }
}
