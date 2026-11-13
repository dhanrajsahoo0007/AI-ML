from typing import List


def max_distance(position: List[int], m: int) -> int:
    position.sort()

    def can(force: int) -> bool:
        prev = position[0]
        cnt = 1
        for x in position[1:]:
            if x - prev >= force:
                cnt += 1
                prev = x
            if cnt == m:
                return True
        return False

    lo, hi = 1, position[-1] - position[0]
    best = 0
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if can(mid):
            best = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return best
