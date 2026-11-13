from typing import List, Optional


class TreeNode:
    def __init__(self, val: int = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right


def height(root: Optional[TreeNode]) -> int:
    if not root:
        return 0
    return 1 + max(height(root.left), height(root.right))


def balance_bst(root: Optional[TreeNode]) -> Optional[TreeNode]:
    values: List[int] = []

    def collect(node: Optional[TreeNode]) -> None:
        if not node:
            return
        collect(node.left)
        values.append(node.val)
        collect(node.right)

    collect(root)

    def build(lo: int, hi: int) -> Optional[TreeNode]:
        if lo > hi:
            return None
        mid = (lo + hi) // 2
        node = TreeNode(values[mid])
        node.left = build(lo, mid - 1)
        node.right = build(mid + 1, hi)
        return node

    return build(0, len(values) - 1)


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


def balance_bst_tests(a0):  # the entry the tests call
    result = _tree_values(balance_bst(_build_tree(a0)))
    return result
