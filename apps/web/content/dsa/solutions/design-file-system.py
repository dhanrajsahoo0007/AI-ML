from typing import Dict, List


class _Node:
    __slots__ = ("children", "is_file", "content")

    def __init__(self) -> None:
        self.children: Dict[str, "_Node"] = {}
        self.is_file: bool = False
        self.content: str = ""


class FileSystem:
    def __init__(self) -> None:
        self._root = _Node()

    def _walk(self, path: str, create: bool) -> _Node:
        parts = [p for p in path.split("/") if p]
        cur = self._root
        for part in parts:
            if part not in cur.children:
                if not create:
                    raise KeyError(path)
                cur.children[part] = _Node()
            cur = cur.children[part]
        return cur

    def ls(self, path: str) -> List[str]:
        if path == "/":
            node = self._root
            return sorted(node.children.keys())
        node = self._walk(path, create=False)
        parts = [p for p in path.split("/") if p]
        if node.is_file:
            return [parts[-1]]
        return sorted(node.children.keys())

    def mkdir(self, path: str) -> None:
        self._walk(path, create=True)

    def addContentToFile(self, file_path: str, content: str) -> None:
        node = self._walk(file_path, create=True)
        node.is_file = True
        node.content += content

    def readContentFromFile(self, file_path: str) -> str:
        node = self._walk(file_path, create=False)
        if not node.is_file:
            return ""
        return node.content
