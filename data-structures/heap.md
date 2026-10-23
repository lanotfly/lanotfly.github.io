---
layout: page
title: "6. Heap / Priority Queue"
permalink: /data-structures/heap/
---

← [Back to the book](../)

## When to reach for it

"Top K", "Kth largest/smallest", "merge K sorted …", streaming median,
always need the min/max *now*. Python's `heapq` is a **min-heap** on a list.

## Complexity

Peek min O(1); push/pop O(log n); build (`heapify`) O(n) — faster than n pushes.
Space O(n). Finding an arbitrary element is O(n): heaps are not search structures.

## Core patterns

```python
import heapq

h = [3, 1, 4]
heapq.heapify(h)          # in-place, O(n)
heapq.heappush(h, 2)
smallest = heapq.heappop(h)   # 1

# Max-heap trick: negate numbers, or store tuples with a flipped key
max_h = []
heapq.heappush(max_h, -10)
biggest = -heapq.heappop(max_h)
```

## Classic interview problem: Kth largest element

Keep a min-heap of size *k*: its root is the kth largest seen so far.
O(n log k) time, O(k) space — better than sorting when k ≪ n, say so.

```python
import heapq

def find_kth_largest(nums: list[int], k: int) -> int:
    heap: list[int] = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)       # evict the smallest of the top-k
    return heap[0]

assert find_kth_largest([3, 2, 1, 5, 6, 4], 2) == 5
```

## Classic problem 2: Merge K sorted lists

```python
import heapq

def merge_k(lists: list[list[int]]) -> list[int]:
    heap = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
    heapq.heapify(heap)
    out = []
    while heap:
        val, i, j = heapq.heappop(heap)
        out.append(val)
        if j + 1 < len(lists[i]):
            heapq.heappush(heap, (lists[i][j + 1], i, j + 1))
    return out
```

Note the tuple `(value, list_id, index)`: the tie-breaker stops Python
from comparing things it can't compare when values are equal.

## Pitfalls

- `heapq` is min-first only. For max, negate — or use `heapq.nlargest` for one-offs.
- `heappushpop` / `heapreplace` are O(log n) in one pass when size is fixed.
- Two heaps (max-heap for lower half, min-heap for upper half) = streaming median.

## Practice

- [ ] Top K frequent elements (Counter + heap, or bucket sort O(n))
- [ ] Find median from a data stream (two heaps)
- [ ] K closest points to origin
- [ ] Task scheduler

Next: [Graph →](graph/)
