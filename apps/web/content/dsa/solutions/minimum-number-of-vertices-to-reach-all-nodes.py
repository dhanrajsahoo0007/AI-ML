from typing import List
from collections import defaultdict, deque


def find_smallest_set_of_vertices(n: int, edges: List[List[int]]) -> List[int]:
    incoming = [False] * n
    for u, v in edges:
        incoming[v] = True
    return [i for i in range(n) if not incoming[i]]


# --- Glue (same as the starter) ---

def find_smallest_set_of_vertices_tests(a0, a1):  # the entry the tests call
    result = find_smallest_set_of_vertices(a0, a1)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
