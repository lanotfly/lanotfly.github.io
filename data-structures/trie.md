---
layout: page
title: "8. Trie (Prefix Tree)"
permalink: /data-structures/trie/
---

← [Back to the book](../)

## When to reach for it

Anything about **prefixes**: autocomplete, spell-check, "find all words
starting with…", IP routing, word search on a board. A trie trades space
(shared prefixes stored once) for O(L) operations, L = word length —
**independent of how many words you stored**. A hash set can't answer prefix queries.

## Complexity

Insert / search / starts-with: O(L). Space: O(total characters) worst case.
Each node holds child pointers (dict in Python) plus an end-of-word flag.

## Core implementation

```python
class TrieNode:
    __slots__ = ("children", "is_end")

    def __init__(self) -> None:
        self.children: dict[str, TrieNode] = {}
        self.is_end = False


class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_end = True

    def _walk(self, prefix: str) -> TrieNode | None:
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node

    def search(self, word: str) -> bool:
        node = self._walk(word)
        return node is not None and node.is_end

    def starts_with(self, prefix: str) -> bool:
        return self._walk(prefix) is not None


trie = Trie()
trie.insert("apple")
assert trie.search("apple") and not trie.search("app")
assert trie.starts_with("app")
```

## Classic interview angle: Word Search II (board + trie)

Build a trie of the target words, then DFS the board, walking the trie as
you go — a dead prefix prunes the whole branch. Delete found words from the
trie (or clear `is_end`) to avoid duplicates. Mentioning *pruning* is the
sentence that separates a pass from a strong pass here.

## Pitfalls

- `is_end` matters: "app" is a prefix of "apple" but not a stored word.
- Memory: a node per character — for huge alphabets use dict children, not fixed arrays, in Python.
- Case & character set: clarify lowercase a–z vs full Unicode up front.

## Practice

- [ ] Implement a trie (above) from memory, without looking
- [ ] Longest word in dictionary built one character at a time
- [ ] Replace words (shortest root / prefix in a sentence)
- [ ] Design search autocomplete (trie + top-3 cache per node)

Next: [Union-Find →](union-find/)
