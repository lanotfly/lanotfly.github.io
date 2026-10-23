---
layout: page
title: "Data Structures for Interviews — The Wiki Book"
permalink: /data-structures/
---

Welcome to the **Data Structures Wiki Book** — a practical, interview-focused
guide. Every chapter follows the same recipe:

1. **When to reach for it** — the signals in a problem statement
2. **Complexity cheat sheet** — time / space you should say out loud
3. **Core implementation** — clean, idiomatic Python
4. **A classic interview problem** — solved end to end
5. **Pitfalls & practice** — what interviewers actually probe

> Interview tip: interviewers don't just grade the code. Say the data
> structure, its complexity, and *why you rejected the alternatives* —
> out loud, before you type.

## 📖 Table of Contents

| # | Chapter | Reach for it when you hear… |
|---|---------|------------------------------|
| 1 | [Arrays & Strings](array-string/) | "subarray", "two pointers", "sliding window" |
| 2 | [Hash Table — dict & set](hash-table/) | "have I seen this?", "count frequencies", "O(1) lookup" |
| 3 | [Linked List](linked-list/) | "reverse in place", "cycle", "middle node", "merge lists" |
| 4 | [Stack & Queue](stack-queue/) | "matching brackets", "next greater", "BFS order", "recent items" |
| 5 | [Tree & Binary Search Tree](tree-bst/) | "traverse", "lowest common ancestor", "validate / kth smallest" |
| 6 | [Heap / Priority Queue](heap/) | "top K", "kth largest", "merge K lists", "median stream" |
| 7 | [Graph](graph/) | "connected", "shortest path (unweighted)", " dependencies / order" |
| 8 | [Trie (Prefix Tree)](trie/) | "prefix", "autocomplete", "dictionary words" |
| 9 | [Union-Find (Disjoint Set)](union-find/) | "are these connected?", "number of groups", "redundant edge" |
| 10 | [Sorting & Binary Search](sorting-binary-search/) | "sorted", "find in log time", "search on the answer" |

## ⏱️ Big-O Cheat Sheet

| Structure | Access | Search | Insert | Delete | Notes |
|-----------|--------|--------|--------|--------|-------|
| Array | O(1) | O(n) | O(n) | O(n) | Insert/delete shift elements |
| Hash table | — | O(1) avg | O(1) avg | O(1) avg | O(n) worst case (collisions) |
| Linked list | O(n) | O(n) | O(1)\* | O(1)\* | \*once you have the node |
| Stack / Queue | O(n) | O(n) | O(1) | O(1) | Push/pop, enqueue/dequeue |
| Binary search tree | O(log n) avg | O(log n) avg | O(log n) avg | O(log n) avg | O(n) if unbalanced |
| Heap | O(1) peek | O(n) | O(log n) | O(log n) pop | Great for top-K |
| Trie | — | O(L) | O(L) | O(L) | L = key length |
| Union-Find | — | O(α(n)) find | O(α(n)) union | — | α ≈ constant in practice |

## 🗺️ A 4-Week Interview Plan

- **Week 1:** Arrays, Hash Tables, Sorting & Binary Search — these appear in ~60% of screens.
- **Week 2:** Linked Lists, Stacks & Queues, Trees.
- **Week 3:** Heaps, Graphs, Tries, Union-Find.
- **Week 4:** Mixed timed practice. For every problem: brute force first,
  name the bottleneck, pick the structure that removes it, then code.

## How to Use Each Python Sample

All samples are self-contained Python 3, use only the standard library,
and favour clarity over golfing — exactly what you want on a whiteboard
or shared editor. Copy one, run it, break it, then rewrite it from memory.
