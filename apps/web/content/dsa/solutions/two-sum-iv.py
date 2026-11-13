from typing import List, Optional


class TreeNode:
    def __init__(self, val: int = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right


class BSTIterator:
    def __init__(self, root: Optional[TreeNode], reverse: bool):
        self.stack: List[TreeNode] = []
        self.reverse = reverse
        self._push_all(root)

    def _push_all(self, node: Optional[TreeNode]) -> None:
        while node:
            self.stack.append(node)
            node = node.right if self.reverse else node.left

    def next(self) -> int:
        node = self.stack.pop()
        self._push_all(node.left if self.reverse else node.right)
        return node.val

    def has_next(self) -> bool:
        return len(self.stack) > 0


def find_target(root: Optional[TreeNode], k: int) -> bool:
    if root is None:
        return False
    forward = BSTIterator(root, False)
    reverse = BSTIterator(root, True)
    left = forward.next()
    right = reverse.next()
    while left < right:
        s = left + right
        if s == k:
            return True
        if s < k:
            left = forward.next()
        else:
            right = reverse.next()
    return False


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


def find_target_tests(a0, a1):  # the entry the tests call
    result = find_target(_build_tree(a0), a1)
    return result
