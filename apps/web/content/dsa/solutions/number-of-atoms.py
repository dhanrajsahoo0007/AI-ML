from collections import defaultdict
from typing import Dict, List


def count_of_atoms(formula: str) -> str:
    stack: List[Dict[str, int]] = [defaultdict(int)]
    i = 0
    n = len(formula)
    while i < n:
        ch = formula[i]
        if ch == "(":
            stack.append(defaultdict(int))
            i += 1
        elif ch == ")":
            top = stack.pop()
            i += 1
            start = i
            while i < n and formula[i].isdigit():
                i += 1
            mult = int(formula[start:i] or 1)
            for name, val in top.items():
                stack[-1][name] += val * mult
        else:
            start = i
            i += 1
            while i < n and formula[i].islower():
                i += 1
            name = formula[start:i]
            start = i
            while i < n and formula[i].isdigit():
                i += 1
            count = int(formula[start:i] or 1)
            stack[-1][name] += count
    parts: List[str] = []
    for name, cnt in sorted(stack[0].items()):
        parts.append(name)
        if cnt > 1:
            parts.append(str(cnt))
    return "".join(parts)
