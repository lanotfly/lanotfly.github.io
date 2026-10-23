---
layout: page
title: "4. Stack & Queue"
permalink: /data-structures/stack-queue/
---

← [Back to the book](../)

## When to reach for it

- **Stack (LIFO):** matching pairs, undo, DFS, "previous / next greater", nested structures.
- **Queue (FIFO):** BFS, scheduling, streaming / recent items, sliding-window maximum.

## Complexity

Push/pop and enqueue/dequeue are O(1). In Python: use `list` as a stack,
and `collections.deque` as a queue — `list.pop(0)` is O(n), never use it as a queue.

## Core patterns

```python
from collections import deque

stack: list[int] = []
stack.append(1); stack.append(2)
stack.pop()            # 2 — last in, first out

queue: deque[int] = deque()
queue.append(1); queue.append(2)
queue.popleft()        # 1 — first in, first out
```

## Classic interview problem: Valid parentheses

```python
def is_valid(s: str) -> bool:
    pairs = {")": "(", "]": "[", "}": "{"}
    stack: list[str] = []
    for ch in s:
        if ch in pairs:                       # a closer
            if not stack or stack.pop() != pairs[ch]:
                return False
        else:
            stack.append(ch)                  # an opener
    return not stack

assert is_valid("()[]{}") and not is_valid("(]")
```

## Classic problem 2: Daily temperatures (monotonic stack)

> For each day, how many days until a warmer day? Keep a stack of indices
> with **decreasing** temperatures; a warmer day resolves everything on top.

```python
def daily_temperatures(t: list[int]) -> list[int]:
    ans = [0] * len(t)
    stack: list[int] = []                     # indices, decreasing temp
    for i, temp in enumerate(t):
        while stack and t[stack[-1]] < temp:
            j = stack.pop()
            ans[j] = i - j
        stack.append(i)
    return ans

assert daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]) == [1, 1, 4, 2, 1, 1, 0, 0]
```

## Pitfalls

- Recursion *is* a stack — deep recursion in Python hits the ~1000 limit; convert to an explicit stack when depth is data-dependent.
- Queue from `list`: always `deque`.
- Monotonic stack: decide strict vs non-strict comparisons *before* coding, and say why.

## Practice

- [ ] Min stack (O(1) `get_min`) — keep a second stack of minimums
- [ ] Implement a queue using two stacks
- [ ] Evaluate reverse Polish notation
- [ ] Sliding window maximum (monotonic deque)

Next: [Tree & BST →](tree-bst/)
