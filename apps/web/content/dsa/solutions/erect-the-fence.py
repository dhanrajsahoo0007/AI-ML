from typing import List, Set, Tuple


def outer_trees(trees: List[List[int]]) -> List[List[int]]:
    if len(trees) <= 2:
        return trees
    trees = sorted(trees, key=lambda p: (p[0], p[1]))

    def orient(a: List[int], b: List[int], c: List[int]) -> int:
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])

    lower: List[List[int]] = []
    for t in trees:
        while len(lower) >= 2 and orient(lower[-2], lower[-1], t) < 0:
            lower.pop()
        lower.append(t)
    upper: List[List[int]] = []
    for t in reversed(trees):
        while len(upper) >= 2 and orient(upper[-2], upper[-1], t) < 0:
            upper.pop()
        upper.append(t)
    merged = lower[:-1] + upper[:-1]
    seen: Set[Tuple[int, int]] = set()
    out: List[List[int]] = []
    for p in merged:
        key = (p[0], p[1])
        if key not in seen:
            seen.add(key)
            out.append(p)
    return out


# --- Glue (same as the starter) ---

def outer_trees_tests(a0):  # the entry the tests call
    result = outer_trees(a0)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
