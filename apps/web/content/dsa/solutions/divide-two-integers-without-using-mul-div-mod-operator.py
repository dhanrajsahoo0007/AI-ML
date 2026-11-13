INT_MAX = 2**31 - 1
INT_MIN = -(2**31)


def divide(dividend: int, divisor: int) -> int:
    if dividend == INT_MIN and divisor == -1:
        return INT_MAX
    sign = -1 if (dividend < 0) ^ (divisor < 0) else 1
    a, b = abs(dividend), abs(divisor)
    ans = 0
    while a >= b:
        cur = b
        mul = 1
        while a >= (cur << 1):
            cur <<= 1
            mul <<= 1
        a -= cur
        ans += mul
    ans *= sign
    return min(max(ans, INT_MIN), INT_MAX)
