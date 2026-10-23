---
layout: page
title: "2. Hash Table — dict & set"
permalink: /data-structures/hash-table/
---

← [Back to the book](../)

## When to reach for it

"Have I seen this before?", counting frequencies, grouping, O(1) lookup.
Python's `dict` and `set` are hash tables — this is the single most-used
structure in coding interviews.

## Complexity

Average O(1) insert / lookup / delete; O(n) worst case with pathological
collisions. Space O(n). Iteration order of `dict` = insertion order (3.7+).

## Core patterns

### Frequency counting

```python
from collections import Counter, defaultdict

freq = Counter("banana")          # {'a': 3, 'n': 2, 'b': 1}
groups: defaultdict[list] = defaultdict(list)
for word in ["eat", "tea", "tan", "ate", "nat", "bat"]:
    key = "".join(sorted(word))   # canonical signature for anagrams
    groups[key].append(word)
# {'aet': ['eat', 'tea', 'ate'], 'ant': ['tan', 'nat'], 'abt': ['bat']}
```

## Classic interview problem: Two Sum (unsorted)

> Return the indices of the two numbers that add to `target`, in one pass.

Trade space for time: store each value's index, look up the complement.

```python
def two_sum(nums: list[int], target: int) -> tuple[int, int] | None:
    seen: dict[int, int] = {}           # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return seen[need], i
        seen[x] = i
    return None

assert two_sum([2, 7, 11, 15], 9) == (0, 1)
```

## Classic problem 2: First non-repeating character

```python
def first_unique(s: str) -> int:
    freq = Counter(s)
    for i, ch in enumerate(s):
        if freq[ch] == 1:
            return i
    return -1
```

## Pitfalls

- Unhashable keys: `list` can't be a dict key — use `tuple` instead.
- Mutating a dict during iteration raises `RuntimeError` — iterate `list(d)`.
- `d[key]` raises `KeyError`; prefer `d.get(key, default)` when unsure.
- For "seen" checks a `set` communicates intent better than a `dict`.

## Practice

- [ ] Valid anagram in O(n) without sorting
- [ ] Longest consecutive sequence — O(n) with a set (only start counting at sequence heads)
- [ ] Subarray sum equals K (prefix sums + hash map)
- [ ] LRU Cache — `dict` ordering + discipline, or `collections.OrderedDict`

Next: [Linked List →](linked-list/)
