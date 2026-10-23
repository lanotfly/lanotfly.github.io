---
layout: page
title: "5. Tree & Binary Search Tree"
permalink: /data-structures/tree-bst/
---

← [Back to the book](../)

## When to reach for it

Hierarchical data, "traverse", divide-and-conquer on subtrees, ordered data
with O(log n) search/insert/delete (a **BST**: left < node < right).

## Complexity

Balanced tree: search/insert/delete O(log n), traversal O(n).
Unbalanced (degenerate) tree: everything degrades to O(n) — always mention this.

## Core implementation & traversals

```python
from __future__ import annotations
from collections import deque
from dataclasses import dataclass

@dataclass
class TreeNode:
    val: int
    left: TreeNode | None = None
    right: TreeNode | None = None

def inorder(root: TreeNode | None) -> list[int]:
    """Left → Root → Right. On a BST this returns sorted order."""
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

def level_order(root: TreeNode | None) -> list[list[int]]:
    """Breadth-first, one list per level — BFS with a queue."""
    if not root:
        return []
    result, queue = [], deque([root])
    while queue:
        level = []
        for _ in range(len(queue)):
            node = queue.popleft()
            level.append(node.val)
            if node.left:  queue.append(node.left)
            if node.right: queue.append(node.right)
        result.append(level)
    return result
```

## Classic interview problem: Lowest common ancestor (BST)

```python
def lca_bst(root: TreeNode, p: int, q: int) -> TreeNode:
    node = root
    while node:
        if p < node.val and q < node.val:
            node = node.left          # both in the left subtree
        elif p > node.val and q > node.val:
            node = node.right         # both in the right subtree
        else:
            return node               # split point = the LCA
    return node
```

## Classic problem 2: Validate a BST

Pass the allowed (low, high) range down — checking only parent vs children is **not** enough.

```python
def is_valid_bst(root: TreeNode | None,
                 low: float = float("-inf"),
                 high: float = float("inf")) -> bool:
    if not root:
        return True
    return (low < root.val < high
            and is_valid_bst(root.left, low, root.val)
            and is_valid_bst(root.right, root.val, high))
```

## Pitfalls

- Preorder / inorder / postorder mix-ups: name the root's position in the sequence.
- Python recursion limit on skewed trees — mention an iterative stack version.
- "Kth smallest in BST" = inorder traversal, stop at k. Don't sort.

## Practice

- [ ] Maximum depth & diameter of a binary tree
- [ ] Invert / mirror a binary tree
- [ ] Serialize & deserialize a binary tree
- [ ] Build a tree from preorder + inorder traversals

Next: [Heap →](heap/)
