def my_sqrt(x: int) -> int:
    if x < 2:
        return x
    lo, hi = 1, x
    ans = 0
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        sq = mid * mid
        if sq == x:
            return mid
        if sq < x:
            ans = mid
            lo = mid + 1
        else:
            hi = mid - 1
    return ans
