---
layout: page
title: "7. Graph"
permalink: /data-structures/graph/
---

← [Back to the book](../)

## When to reach for it

Relationships & paths: "connected", "can A reach B", "shortest path",
"course order / dependencies", grids (a grid **is** a graph — cells are nodes,
neighbours are edges).

## Representations

| | Adjacency list | Adjacency matrix |
|--|----------------|------------------|
| Space | O(V + E) | O(V²) |
| Check edge u→v | O(degree) | O(1) |
| Best for | Sparse graphs (most interviews) | Dense graphs |

## Core traversals

```python
from collections import deque

def bfs(graph: dict[int, list[int]], start: int) -> list[int]:
    """Breadth-first: shortest path in EDGES for unweighted graphs."""
    seen = {start}
    order, queue = [], deque([start])
    while queue:
        u = queue.popleft()
        order.append(u)
        for v in graph.get(u, []):
            if v not in seen:
                seen.add(v)               # mark when ENQUEUING, not dequeuing
                queue.append(v)
    return order

def dfs(graph: dict[int, list[int]], start: int) -> list[int]:
    seen, order, stack = set(), [], [start]
    while stack:
        u = stack.pop()
        if u in seen:
            continue
        seen.add(u)
        order.append(u)
        stack.extend(graph.get(u, []))
    return order
```

## Classic interview problem: Number of islands (grid DFS/BFS)

```python
def num_islands(grid: list[list[str]]) -> int:
    if not grid:
        return 0
    rows, cols, count = len(grid), len(grid[0]), 0

    def sink(r: int, c: int) -> None:
        if not (0 <= r < rows and 0 <= c < cols) or grid[r][c] != "1":
            return
        grid[r][c] = "0"                  # visited = sink it
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sink(r + dr, c + dc)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == "1":
                count += 1
                sink(r, c)
    return count
```

## Know the names (say them in interviews)

- **Topological sort** (Kahn's BFS on in-degrees) — ordering with dependencies, cycle = leftover nodes.
- **Dijkstra** — shortest path, weighted, no negative edges; BFS + priority queue (a [heap](heap/)).
- **Bellman-Ford** — tolerates negative edges, O(V·E).
- **Union-Find** — connectivity without paths: [Chapter 9](union-find/).

## Pitfalls

- Mark visited at enqueue time in BFS or you'll enqueue duplicates.
- Clarify: directed or undirected? weighted? cycles? disconnected components?
- Grid problems: state the 4-direction (or 8-direction) assumption.

## Practice

- [ ] Clone graph
- [ ] Course schedule (topological sort / cycle detection)
- [ ] Rotting oranges (multi-source BFS)
- [ ] Word ladder (BFS on implicit graph)

Next: [Trie →](trie/)
