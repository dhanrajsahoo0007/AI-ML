from typing import List, Optional


class TreeNode:
    """Segment-tree node: val is the sum over indexes [lo, hi]; children cover halves."""

    def __init__(self, val: int = 0, left: Optional["TreeNode"] = None, right: Optional["TreeNode"] = None):
        self.val = val
        self.left = left
        self.right = right
        self.lo = 0
        self.hi = 0


class Solution:
    def __init__(self, nums: List[int]):
        self._nums = list(nums)
        self.root = self._build(0, len(nums) - 1) if nums else None

    def _build(self, lo: int, hi: int) -> TreeNode:
        node = TreeNode()
        node.lo = lo
        node.hi = hi
        if lo == hi:
            node.val = self._nums[lo]
            return node
        mid = (lo + hi) // 2
        node.left = self._build(lo, mid)
        node.right = self._build(mid + 1, hi)
        node.val = node.left.val + node.right.val
        return node

    def update(self, index: int, val: int) -> None:
        def dfs(node: Optional[TreeNode]) -> None:
            if not node:
                return
            if node.lo == node.hi:
                node.val = val
                return
            mid = (node.lo + node.hi) // 2
            if index <= mid:
                dfs(node.left)
            else:
                dfs(node.right)
            node.val = (node.left.val if node.left else 0) + (node.right.val if node.right else 0)

        dfs(self.root)
        self._nums[index] = val

    def sumRange(self, left: int, right: int) -> int:
        def dfs(node: Optional[TreeNode]) -> int:
            if not node or right < node.lo or left > node.hi:
                return 0
            if left <= node.lo and node.hi <= right:
                return node.val
            return dfs(node.left) + dfs(node.right)

        return dfs(self.root)
