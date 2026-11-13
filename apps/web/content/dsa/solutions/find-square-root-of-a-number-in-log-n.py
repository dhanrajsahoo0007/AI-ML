def my_sqrt(x: int) -> int:
    if x < 2:
        return x
    left, right = 1, x
    ans = 0
    while left <= right:
        mid = left + (right - left) // 2
        sq = mid * mid
        if sq == x:
            return mid
        if sq > x:
            right = mid - 1
        else:
            ans = mid
            left = mid + 1
    return ans
