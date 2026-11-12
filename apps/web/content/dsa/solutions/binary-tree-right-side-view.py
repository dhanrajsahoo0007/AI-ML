from collections import deque


# --- Glue: converts the test array to nodes. Leave as is. ---
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right


def _to_tree(values):
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    q = deque([root])
    i = 1
    while q and i < len(values):
        node = q.popleft()
        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            q.append(node.left)
        i += 1
        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            q.append(node.right)
        i += 1
    return root


def right_side_view(values: list[int | None]) -> list[int]:  # the entry the tests call
    return right_view_of(_to_tree(values))


# --- Your code ---
def right_view_of(root: TreeNode | None) -> list[int]:
    if not root:
        return []
    result = []
    queue = deque([root])
    while queue:
        level_size = len(queue)
        right_val = 0
        for _ in range(level_size):
            node = queue.popleft()
            right_val = node.val
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(right_val)
    return result
