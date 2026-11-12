from typing import List


def maximum_even_split(finalSum: int) -> List[int]:
    if finalSum % 2:
        return []
    ans: List[int] = []
    need = finalSum
    nxt = 2
    while nxt <= need:
        ans.append(nxt)
        need -= nxt
        nxt += 2
    if need:
        ans[-1] += need
    return ans
