---
layout: page
title: "9. Union-Find (Disjoint Set)"
permalink: /data-structures/union-find/
---

← [Back to the book](../)

## When to reach for it

Dynamic connectivity: "are A and B in the same group?", "how many groups?",
"does this edge create a cycle?" — in **almost O(1)** per operation.
It's the connectivity engine inside Kruskal's minimum-spanning-tree algorithm.

## Complexity

With **path compression + union by rank/size**: amortised O(α(n)) per op,
where α (inverse Ackermann) is ≤ 5 for any realistic n. Space O(n).

## Core implementation

```python
class UnionFind:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))   # everyone starts in their own set
        self.rank = [0] * n
        self.components = n            # handy for "number of groups" questions

    def find(self, x: int) -> int:
        # Path compression: point every node on the path straight at the root
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> bool:
        """Merge; return False if they were already connected (a cycle!)."""
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.rank[ra] < self.rank[rb]:   # union by rank: smaller under bigger
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        self.components -= 1
        return True

    def connected(self, a: int, b: int) -> bool:
        return self.find(a) == self.find(b)
```

## Classic interview problem: Number of provinces

```python
def find_circle_num(is_connected: list[list[int]]) -> int:
    n = len(is_connected)
    uf = UnionFind(n)
    for i in range(n):
        for j in range(i + 1, n):
            if is_connected[i][j]:
                uf.union(i, j)
    return uf.components

assert find_circle_num([[1, 1, 0], [1, 1, 0], [0, 0, 1]]) == 2
```

And "redundant connection" is one line of logic: the first edge whose
`union()` returns `False` is the answer.

## Pitfalls

- Skip path compression *or* union by rank and depth can degrade to O(n).
- `components` bookkeeping: decrement only on a successful merge.
- Union-Find answers connectivity, **not paths** — for "give me the route", use [Graph BFS/DFS](graph/).

## Practice

- [ ] Redundant connection
- [ ] Accounts merge (map emails → ids, then union)
- [ ] Number of connected components in an undirected graph
- [ ] Satisfiability of equality equations

Next: [Sorting & Binary Search →](sorting-binary-search/)
