from collections import defaultdict
from typing import Dict, List, Optional, Tuple


class TreeNode:
    def __init__(self, val: int = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right


def vertical_traversal(root: Optional[TreeNode]) -> List[List[int]]:
    if not root:
        return []
    vertical_table: Dict[int, List[Tuple[int, int]]] = defaultdict(list)

    def dfs(node: Optional[TreeNode], row: int, col: int) -> None:
        if not node:
            return
        vertical_table[col].append((row, node.val))
        dfs(node.left, row + 1, col - 1)
        dfs(node.right, row + 1, col + 1)

    dfs(root, 0, 0)
    result: List[List[int]] = []
    for col in sorted(vertical_table.keys()):
        column_nodes = sorted(vertical_table[col])
        result.append([val for _, val in column_nodes])
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


def vertical_traversal_tests(a0):  # the entry the tests call
    result = vertical_traversal(_build_tree(a0))
    return result
