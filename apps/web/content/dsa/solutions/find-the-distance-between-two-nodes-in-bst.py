from typing import List, Optional


class TreeNode:
    def __init__(self, val: int = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right


def distance_between_values(root: Optional[TreeNode], p: int, q: int) -> int:
    def path_to(target: int) -> List[TreeNode]:
        cur = root
        out: List[TreeNode] = []
        while cur:
            out.append(cur)
            if cur.val == target:
                return out
            cur = cur.left if target < cur.val else cur.right
        raise ValueError("value not in BST")

    pa = path_to(p)
    pb = path_to(q)
    i = 0
    while i < len(pa) and i < len(pb) and pa[i] is pb[i]:
        i += 1
    return len(pa) + len(pb) - 2 * i


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


def distance_between_values_tests(a0, a1, a2):  # the entry the tests call
    result = distance_between_values(_build_tree(a0), a1, a2)
    return result
