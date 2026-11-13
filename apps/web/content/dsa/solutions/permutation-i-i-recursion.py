from typing import List


def generate_permutations(s: str) -> List[str]:
    chars = list(s)
    chars.sort()
    result: List[str] = []

    def swap(i: int, j: int) -> None:
        """Swap two positions in the mutable char list (swap-based permutation)."""
        chars[i], chars[j] = chars[j], chars[i]

    def backtrack(start: int) -> None:
        # Base case: fixed every position — snapshot the current ordering.
        if start == len(chars):
            result.append("".join(chars))
            return
        # At depth `start`, never place the same digit twice (handles duplicates like "aab").
        used_at_pos: set[str] = set()
        for i in range(start, len(chars)):
            if chars[i] in used_at_pos:
                continue
            used_at_pos.add(chars[i])
            swap(start, i)
            backtrack(start + 1)
            swap(start, i)  # undo swap: classic backtrack unwind

    backtrack(0)
    return result
