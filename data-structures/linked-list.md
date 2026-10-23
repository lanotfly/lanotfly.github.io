---
layout: page
title: "3. Linked List"
permalink: /data-structures/linked-list/
---

← [Back to the book](../)

## When to reach for it

Frequent inserts/deletes, no random access needed, "reverse / reorder /
detect a cycle in a chain". Interviews love it because it tests pointer care.

## Complexity

Access & search O(n); insert/delete O(1) **once you hold the node**;
space O(n), no resizing ever.

## Core implementation

```python
from __future__ import annotations
from dataclasses import dataclass

@dataclass
class ListNode:
    val: int
    next: ListNode | None = None
```

### The dummy head trick — never special-case the head again

```python
def delete_value(head: ListNode | None, target: int) -> ListNode | None:
    dummy = ListNode(0, head)
    cur = dummy
    while cur.next:
        if cur.next.val == target:
            cur.next = cur.next.next
        else:
            cur = cur.next
    return dummy.next
```

## Classic interview problem: Reverse a linked list

```python
def reverse(head: ListNode | None) -> ListNode | None:
    prev, cur = None, head
    while cur:
        nxt = cur.next      # save
        cur.next = prev     # flip
        prev, cur = cur, nxt
    return prev
```

## Classic problem 2: Detect a cycle (Floyd's tortoise & hare)

```python
def has_cycle(head: ListNode | None) -> bool:
    slow = fast = head
    while fast and fast.next:
        slow = slow.next          # 1 step
        fast = fast.next.next     # 2 steps — they must meet inside a cycle
        if slow is fast:
            return True
    return False
```

Finding the *middle* uses the same two speeds: when `fast` ends, `slow` is mid.

## Pitfalls

- Losing the rest of the list: always save `cur.next` before rewiring.
- Forgetting the base cases: empty list, single node, cycle.
- In Python interviews, state the complexity of *your* operations —
  `list.pop(0)` is O(n), a linked list pop-front is O(1).

## Practice

- [ ] Merge two sorted lists (dummy head again)
- [ ] Remove the Nth node from the end (two pointers, gap of N)
- [ ] Intersection of two lists
- [ ] Palindrome linked list (middle + reverse half)

Next: [Stack & Queue →](stack-queue/)
