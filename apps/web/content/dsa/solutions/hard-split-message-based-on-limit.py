from typing import List


def split_message(message: str, limit: int) -> List[str]:
    n = len(message)
    for b in range(1, n + 1):
        w = len(str(b))
        idx = 0
        out: List[str] = []
        ok = True
        for a in range(1, b + 1):
            suf = f"<{a}/{b}>"
            room = limit - len(suf)
            if room < 1:
                ok = False
                break
            if a < b:
                if idx + room > n:
                    ok = False
                    break
                chunk = message[idx : idx + room]
                out.append(chunk + suf)
                idx += room
            else:
                chunk = message[idx:]
                if len(chunk) > room:
                    ok = False
                    break
                out.append(chunk + suf)
                idx += len(chunk)
        if ok and idx == n:
            return out
    return []
