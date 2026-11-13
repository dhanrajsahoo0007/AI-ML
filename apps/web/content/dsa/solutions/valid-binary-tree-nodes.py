from typing import List


class Solution:
    def __init__(self) -> None:
        self.parent: List[int] = []
        self.components = 0

    def find(self, x: int) -> int:
        if self.parent[x] == x:
            return x
        self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, par: int, child: int) -> bool:
        child_ka_parent = self.find(child)

        # Child already has a parent
        if child_ka_parent != child:
            return False

        parent_ka_parent = self.find(par)
        # Parallel edge (already connected by another edge)
        if parent_ka_parent == child_ka_parent:
            return False

        self.parent[child] = par
        self.components -= 1
        return True

    def validateBinaryTreeNodes(self, n: int, leftChild: List[int], rightChild: List[int]) -> bool:
        self.components = n
        self.parent = list(range(n))

        for i in range(n):
            if leftChild[i] >= 0 and not self.union(i, leftChild[i]):
                return False
            if rightChild[i] >= 0 and not self.union(i, rightChild[i]):
                return False

        return self.components == 1
