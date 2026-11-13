from __future__ import annotations

from typing import List, Optional


class TreeNode:
    __slots__ = ("val", "left", "right")

    def __init__(self, val: int = 0, left: Optional[TreeNode] = None, right: Optional[TreeNode] = None):
        self.val = val
        self.left = left
        self.right = right


def generate_trees(n: int) -> List[Optional[TreeNode]]:
    memo: dict[tuple[int, int], List[Optional[TreeNode]]] = {}

    def build(lo: int, hi: int) -> List[Optional[TreeNode]]:
        if lo > hi:
            return [None]
        key = (lo, hi)
        if key in memo:
            return memo[key]
        out: List[Optional[TreeNode]] = []
        for r in range(lo, hi + 1):
            for left in build(lo, r - 1):
                for right in build(r + 1, hi):
                    out.append(TreeNode(r, left, right))
        memo[key] = out
        return out

    return build(1, n)


# --- Glue (same as the starter) ---

def _build_tree(values):
    if not values:
        return None
    nodes = [None if v is None else TreeNode(v) for v in values]
    queue, i = [nodes[0]], 1
    for node in queue:
        if node is None:
            continue
        for side in ("left", "right"):
            if i < len(values):
                setattr(node, side, nodes[i])
                queue.append(nodes[i])
                i += 1
        if i >= len(values):
            break
    return nodes[0]


def _tree_values(root):
    out, queue = [], [root] if root else []
    for node in queue:
        if node is None:
            out.append(None)
        else:
            out.append(node.val)
            queue += [node.left, node.right]
    while out and out[-1] is None:
        out.pop()
    return out


def generate_trees_tests(a0):  # the entry the tests call
    result = [_tree_values(x) for x in generate_trees(a0)]
    return result
