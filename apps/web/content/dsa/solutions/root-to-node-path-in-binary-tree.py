from typing import List, Optional


class TreeNode:
    def __init__(self, val: int = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right


def find_path(root: Optional[TreeNode], target: int) -> List[int]:
    path: List[int] = []

    def dfs(node: Optional[TreeNode]) -> bool:
        if not node:
            return False
        path.append(node.val)
        if node.val == target:
            return True
        if dfs(node.left) or dfs(node.right):
            return True
        path.pop()
        return False

    dfs(root)
    return path


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


def find_path_tests(a0, a1):  # the entry the tests call
    result = find_path(_build_tree(a0), a1)
    return result
