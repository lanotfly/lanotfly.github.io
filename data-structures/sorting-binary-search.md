---
layout: page
title: "10. Sorting & Binary Search"
permalink: /data-structures/sorting-binary-search/
---

← [Back to the book](../) · 🏠 [Book home](../)

## Sorting — what to say

| Algorithm | Avg | Worst | Space | Stable? |
|-----------|-----|-------|-------|---------|
| QuickSort | O(n log n) | O(n²) | O(log n) | No |
| MergeSort | O(n log n) | O(n log n) | O(n) | Yes |
| HeapSort | O(n log n) | O(n log n) | O(1) | No |
| Timsort (Python `sorted`) | O(n log n) | O(n log n) | O(n) | Yes |

In interviews: use Python's built-in `sorted` / `list.sort` (Timsort) unless
asked to implement one. Know **one** O(n log n) sort cold — merge sort reads best:

```python
def merge_sort(a: list[int]) -> list[int]:
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left, right = merge_sort(a[:mid]), merge_sort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:       # <= keeps it stable
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:]
```

Custom keys: `sorted(words, key=lambda w: (len(w), w))`, and
`functools.cmp_to_key` for comparator-style questions ("largest number").

## Binary search — the template that never off-by-ones

```python
def binary_search(a: list[int], target: int) -> int:
    lo, hi = 0, len(a) - 1            # search the CLOSED interval [lo, hi]
    while lo <= hi:
        mid = lo + (hi - lo) // 2     # overflow-safe form (say why!)
        if a[mid] == target:
            return mid
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
```

Python shortcut for sorted data: `bisect.bisect_left(a, x)` — first position
where `x` can be inserted. `bisect_right` gives the last. Difference = count of `x`.

## Classic interview problem: Search on the answer (Koko eating bananas)

> Koko eats at speed *k* bananas/hour (one pile per hour, rounded up).
> Find the **minimum k** to finish all piles within `h` hours.

The trick: don't search the array — binary-search the *answer space*.
Feasibility is monotonic: if speed k works, any faster speed works too.

```python
import math

def min_eating_speed(piles: list[int], h: int) -> int:
    def hours_needed(k: int) -> int:
        return sum(math.ceil(p / k) for p in piles)

    lo, hi = 1, max(piles)
    while lo < hi:
        mid = (lo + hi) // 2
        if hours_needed(mid) <= h:
            hi = mid                  # mid works — try slower
        else:
            lo = mid + 1              # too slow — must speed up
    return lo

assert min_eating_speed([3, 6, 7, 11], 8) == 4
```

This "binary search on a monotonic predicate" pattern also solves:
ship-packages-within-D-days, split-array-largest-sum, and capacity problems.

## Pitfalls

- Binary search on an unsorted array — always verify / state the sorted precondition.
- Rotated sorted arrays: one half is always sorted; decide which half can hold the target.
- Infinite loop from `lo = mid` (instead of `mid + 1`) with the closed-interval template.

## Practice

- [ ] First / last position of an element in a sorted array (`bisect`, then by hand)
- [ ] Search in rotated sorted array
- [ ] Find peak element
- [ ] Median of two sorted arrays (binary search on the partition)

---

🎓 **End of the book.** Revisit the [Big-O cheat sheet](../) and re-derive
every chapter's core code from memory — that's the real interview test.
