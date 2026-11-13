from typing import Dict, List


class _INode:
    __slots__ = ("children", "is_file", "content")

    def __init__(self) -> None:
        self.children: Dict[str, "_INode"] = {}
        self.is_file: bool = False
        self.content: str = ""


class InMemoryFileSystem:
    def __init__(self) -> None:
        self._root = _INode()

    def _traverse(self, path: str, create: bool) -> _INode:
        parts = [p for p in path.split("/") if p]
        node = self._root
        for name in parts:
            if name not in node.children:
                if not create:
                    raise KeyError(path)
                node.children[name] = _INode()
            node = node.children[name]
        return node

    def ls(self, path: str) -> List[str]:
        if path == "/":
            return sorted(self._root.children.keys())
        node = self._traverse(path, create=False)
        segs = [p for p in path.split("/") if p]
        if node.is_file:
            return [segs[-1]]
        return sorted(node.children.keys())

    def mkdir(self, path: str) -> None:
        self._traverse(path, create=True)

    def addContentToFile(self, path: str, content: str) -> None:
        n = self._traverse(path, create=True)
        n.is_file = True
        n.content += content

    def readContentFromFile(self, path: str) -> str:
        n = self._traverse(path, create=False)
        return n.content if n.is_file else ""
