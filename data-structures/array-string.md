---
layout: page
title: "1. Arrays & Strings"
permalink: /data-structures/array-string/
---

← [Back to the book](../)

## When to reach for it

Contiguous data, index-based access, "subarray / substring", order matters.
In Python, `list` **is** your array, and `str` is an immutable array of characters.

## Complexity

| Operation | Time | Why |
|-----------|------|-----|
| Access `a[i]` | O(1) | Direct index |
| Append | O(1) amortised | Occasional resize |
| Insert / delete in middle | O(n) | Everything shifts |
| Search (unsorted) | O(n) | Must scan |
| Search (sorted) | O(log n) | Binary search — [Chapter 10](sorting-binary-search/) |

## Core patterns

### Two pointers — remove duplicates from a sorted array

```python
def remove_duplicates(nums: list[int]) -> int:
    """Return the length of the deduplicated prefix, in place."""
    if not nums:
        return 0
    write = 1  # next position to write a new unique value
    for read in range(1, len(nums)):
        if nums[read] != nums[read - 1]:
            nums[write] = nums[read]
            write += 1
    return write
```

### Sliding window — longest substring without repeating characters

```python
def length_of_longest_substring(s: str) -> int:
    last_seen: dict[str, int] = {}
    left = best = 0
    for right, ch in enumerate(s):
        if ch in last_seen and last_seen[ch] >= left:
            left = last_seen[ch] + 1   # shrink the window past the duplicate
        last_seen[ch] = right
        best = max(best, right - left + 1)
    return best

assert length_of_longest_substring("abcabcbb") == 3  # "abc"
```

## Classic interview problem: Two Sum (sorted)

> Given a **sorted** array, return the indices of the two numbers that add to `target`.

Two pointers beat a hash map here: O(n) time, **O(1)** space — say that trade-off out loud.

```python
def two_sum_sorted(nums: list[int], target: int) -> tuple[int, int] | None:
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        total = nums[lo] + nums[hi]
        if total == target:
            return lo, hi
        if total < target:
            lo += 1    # need a bigger sum
        else:
            hi -= 1    # need a smaller sum
    return None
```

## Pitfalls

- Mutating a list while iterating over it — iterate over a copy or backwards.
- `a = b` does **not** copy a list; use `b.copy()`, `b[:]`, or `list(b)`.
- Off-by-one in windows: be consistent — this book uses inclusive `right`.

## Practice

- [ ] Rotate array by *k* steps, in place
- [ ] Merge two sorted arrays
- [ ] Longest palindromic substring (expand around centre)
- [ ] Container with most water (two pointers)

Next: [Hash Table →](hash-table/)
