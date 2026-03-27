/**
 * GADDAG (Directed Acyclic Word Graph) implementation.
 *
 * A GADDAG stores words in a trie-like structure that allows efficient
 * generation of all words passing through any anchor square.
 *
 * For a word like CAT, the GADDAG stores these paths:
 *   C > A > T #          (forward from C)
 *   A > C + A > T #      (reverse to C, then forward through A, T)
 *   T > A > C + A > T #  (reverse to C, then forward through A, T)
 *
 * The '+' separator marks the transition from going left to going right.
 * '#' marks word completion.
 *
 * We use a compact trie representation:
 *   node = { children: Map<char, node>, isTerminal: boolean }
 */

const SEPARATOR = '+';

export class GADDAG {
  constructor() {
    this.root = { children: new Map(), isTerminal: false };
    this.wordCount = 0;
  }

  /**
   * Add a word to the GADDAG.
   */
  addWord(word) {
    const w = word.toUpperCase();
    if (w.length === 0) return;
    this.wordCount++;

    // For each position i in the word, insert:
    //   w[i-1] w[i-2] ... w[0] + w[i] w[i+1] ... w[n-1]
    for (let i = 0; i <= w.length; i++) {
      let node = this.root;

      // Reversed prefix: w[i-1], w[i-2], ..., w[0]
      for (let j = i - 1; j >= 0; j--) {
        node = this._getOrCreateChild(node, w[j]);
      }

      // Separator
      if (i < w.length) {
        node = this._getOrCreateChild(node, SEPARATOR);

        // Forward suffix: w[i], w[i+1], ..., w[n-1]
        for (let j = i; j < w.length; j++) {
          node = this._getOrCreateChild(node, w[j]);
        }
      }

      node.isTerminal = true;
    }
  }

  _getOrCreateChild(node, ch) {
    let child = node.children.get(ch);
    if (!child) {
      child = { children: new Map(), isTerminal: false };
      node.children.set(ch, child);
    }
    return child;
  }

  /**
   * Check if a word exists in the GADDAG.
   */
  hasWord(word) {
    const w = word.toUpperCase();
    // Use the path starting from first letter: w[0] + w[0] w[1] ... w[n-1]
    // Actually, easiest path: reverse the whole word, then separator, then full word
    // Simpler: just check via the 0th position path: + w[0] w[1] ... w[n-1]
    let node = this.root;
    // Start with first letter reversed (just w[0]), then separator, then rest
    node = node.children.get(w[0]);
    if (!node) return false;
    node = node.children.get(SEPARATOR);
    if (!node) return false;
    for (let i = 1; i < w.length; i++) {
      node = node.children.get(w[i]);
      if (!node) return false;
    }
    return node.isTerminal;
  }

  /**
   * Build from an array of words.
   */
  static build(words) {
    const g = new GADDAG();
    for (const word of words) {
      if (word.length >= 2 && word.length <= 15) {
        g.addWord(word);
      }
    }
    return g;
  }

  /**
   * Serialize to a compact JSON-friendly format for caching.
   * Uses arrays instead of Maps for JSON compatibility.
   */
  serialize() {
    function serializeNode(node) {
      const result = {};
      if (node.isTerminal) result.t = 1;
      if (node.children.size > 0) {
        result.c = {};
        for (const [ch, child] of node.children) {
          result.c[ch] = serializeNode(child);
        }
      }
      return result;
    }
    return { root: serializeNode(this.root), wordCount: this.wordCount };
  }

  /**
   * Deserialize from the compact format.
   */
  static deserialize(data) {
    function deserializeNode(obj) {
      const node = {
        children: new Map(),
        isTerminal: !!obj.t,
      };
      if (obj.c) {
        for (const ch in obj.c) {
          node.children.set(ch, deserializeNode(obj.c[ch]));
        }
      }
      return node;
    }
    const g = new GADDAG();
    g.root = deserializeNode(data.root);
    g.wordCount = data.wordCount;
    return g;
  }
}

export { SEPARATOR };
