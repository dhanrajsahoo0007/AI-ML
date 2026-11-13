from typing import List, Optional


class TreeNode:
    def __init__(self, val: int = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right


def find_leaves(root: Optional[TreeNode]) -> List[List[int]]:
    result: List[List[int]] = []

    def dfs(node: Optional[TreeNode]) -> int:
        if not node:
            return -1
        lh = dfs(node.left)
        rh = dfs(node.right)
        height = max(lh, rh) + 1
        while len(result) <= height:
            result.append([])
        result[height].append(node.val)
        return height

    dfs(root)
    return result


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


def find_leaves_tests(a0):  # the entry the tests call
    result = find_leaves(_build_tree(a0))
    return result
