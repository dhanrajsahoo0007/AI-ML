from typing import List, Optional, Tuple


class TreeNode:
    def __init__(self, val: int = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right


def largest_bst_subtree(root: Optional[TreeNode]) -> int:
    def dfs(node: Optional[TreeNode]) -> Tuple[int, float, float, bool]:
        if node is None:
            return 0, float("inf"), float("-inf"), True
        left = dfs(node.left)
        right = dfs(node.right)
        if left[3] and right[3] and left[2] < node.val < right[1]:
            size = left[0] + right[0] + 1
            return size, min(left[1], node.val), max(right[2], node.val), True
        return max(left[0], right[0]), float("-inf"), float("inf"), False

    return dfs(root)[0]


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


def largest_bst_subtree_tests(a0):  # the entry the tests call
    result = largest_bst_subtree(_build_tree(a0))
    return result
