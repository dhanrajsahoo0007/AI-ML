from collections import deque
from typing import Deque, List, Optional


class TreeNode:
    def __init__(self, val: int = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right


def closest_k_values(root: Optional[TreeNode], target: float, k: int) -> List[int]:
    window: Deque[int] = deque()

    def dfs(node: Optional[TreeNode]) -> None:
        if node is None:
            return
        dfs(node.left)
        if len(window) < k:
            window.append(node.val)
        else:
            if abs(window[0] - target) > abs(node.val - target):
                window.popleft()
                window.append(node.val)
            else:
                return
        dfs(node.right)

    dfs(root)
    return list(window)


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


def closest_k_values_tests(a0, a1, a2):  # the entry the tests call
    result = closest_k_values(_build_tree(a0), a1, a2)
    return result
