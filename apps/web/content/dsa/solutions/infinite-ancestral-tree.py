from typing import Dict, Optional, Set, Tuple


PersonId = str


class InfiniteAncestralTree:
    def __init__(self, parents: Dict[PersonId, Tuple[Optional[PersonId], Optional[PersonId]]]) -> None:
        self._p = parents

    def parents_of(self, pid: PersonId) -> Set[PersonId]:
        a, b = self._p.get(pid, (None, None))
        return {x for x in (a, b) if x is not None}

    def are_siblings(self, a: PersonId, b: PersonId) -> bool:
        if a == b:
            return False
        return bool(self.parents_of(a) & self.parents_of(b))

    def are_first_cousins(self, a: PersonId, b: PersonId) -> bool:
        if self.are_siblings(a, b):
            return False
        pa = self.parents_of(a)
        pb = self.parents_of(b)
        for pa_i in pa:
            for pb_j in pb:
                if self.are_siblings(pa_i, pb_j):
                    return True
        return False

    def lowest_common_ancestor(self, a: PersonId, b: PersonId) -> Optional[PersonId]:
        seen_a: Set[PersonId] = set()
        seen_b: Set[PersonId] = set()
        frontier_a = {a}
        frontier_b = {b}
        while frontier_a or frontier_b:
            if frontier_a & frontier_b:
                return min(frontier_a & frontier_b)
            if frontier_a & seen_b:
                return min(frontier_a & seen_b)
            if frontier_b & seen_a:
                return min(frontier_b & seen_a)
            seen_a |= frontier_a
            seen_b |= frontier_b
            nxt_a: Set[PersonId] = set()
            for pid in frontier_a:
                nxt_a |= self.parents_of(pid)
            nxt_b: Set[PersonId] = set()
            for pid in frontier_b:
                nxt_b |= self.parents_of(pid)
            frontier_a = nxt_a - seen_a
            frontier_b = nxt_b - seen_b
        return None
