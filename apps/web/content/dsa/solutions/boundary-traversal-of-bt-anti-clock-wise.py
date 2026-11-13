from typing import List, Optional


class TreeNode:
    def __init__(self, val: int = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right


def boundary_traversal(root: Optional[TreeNode]) -> List[int]:
    if not root:
        return []

    def is_leaf(node: TreeNode) -> bool:
        return node.left is None and node.right is None

    if is_leaf(root):
        return [root.val]

    result: List[int] = [root.val]

    def add_left_boundary(node: TreeNode) -> None:
        cur = node.left
        while cur:
            if not is_leaf(cur):
                result.append(cur.val)
            cur = cur.left if cur.left else cur.right

    def add_right_boundary(node: TreeNode) -> None:
        cur = node.right
        buf: List[int] = []
        while cur:
            if not is_leaf(cur):
                buf.append(cur.val)
            cur = cur.right if cur.right else cur.left
        result.extend(reversed(buf))

    def add_leaves(node: TreeNode) -> None:
        if is_leaf(node):
            result.append(node.val)
            return
        if node.left:
            add_leaves(node.left)
        if node.right:
            add_leaves(node.right)

    if not is_leaf(root):
        add_left_boundary(root)
    add_leaves(root)
    if not is_leaf(root):
        add_right_boundary(root)
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


def boundary_traversal_tests(a0):  # the entry the tests call
    result = boundary_traversal(_build_tree(a0))
    return result
