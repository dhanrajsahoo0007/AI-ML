from collections import deque
from typing import List, Optional, Tuple


class TreeNode:
    def __init__(self, val: int = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right


def width_of_binary_tree(root: Optional[TreeNode]) -> int:
    if not root:
        return 0
    q: deque[Tuple[TreeNode, int]] = deque([(root, 0)])
    best = 0
    while q:
        _, leftmost = q[0]
        level_size = len(q)
        rightmost = leftmost
        for _ in range(level_size):
            node, idx = q.popleft()
            rightmost = idx
            if node.left:
                q.append((node.left, 2 * idx + 1))
            if node.right:
                q.append((node.right, 2 * idx + 2))
        best = max(best, rightmost - leftmost + 1)
    return best


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


def width_of_binary_tree_tests(a0):  # the entry the tests call
    result = width_of_binary_tree(_build_tree(a0))
    return result
