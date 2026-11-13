from typing import List, Optional


class TreeNode:
    def __init__(self, val: int = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right


def kth_largest(root: Optional[TreeNode], k: int) -> int:
    stack: list[TreeNode] = []
    cur = root
    while cur or stack:
        while cur:
            stack.append(cur)
            cur = cur.right
        cur = stack.pop()
        k -= 1
        if k == 0:
            return cur.val
        cur = cur.left
    raise ValueError("k out of range")


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


def kth_largest_tests(a0, a1):  # the entry the tests call
    result = kth_largest(_build_tree(a0), a1)
    return result
