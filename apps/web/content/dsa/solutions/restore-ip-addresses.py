from typing import List


def restore_ip_addresses(s: str) -> List[str]:
    n = len(s)
    result: List[str] = []

    def valid_segment(seg: str) -> bool:
        if not seg:
            return False
        if len(seg) > 1 and seg[0] == "0":
            return False
        return int(seg) <= 255

    def dfs(start: int, parts: List[str]) -> None:
        if len(parts) == 4:
            if start == n:
                result.append(".".join(parts))
            return
        remaining_segments = 4 - len(parts)
        max_take = min(3, n - start - (remaining_segments - 1))
        for length in range(1, max_take + 1):
            seg = s[start : start + length]
            if not valid_segment(seg):
                continue
            parts.append(seg)
            dfs(start + length, parts)
            parts.pop()

    if 4 <= n <= 12:
        dfs(0, [])
    return result
