from typing import List


def simplify_path(path: str) -> str:
    stack: List[str] = []
    for part in path.split("/"):
        if not part or part == ".":
            continue
        if part == "..":
            if stack:
                stack.pop()
        else:
            stack.append(part)
    return "/" + "/".join(stack)
