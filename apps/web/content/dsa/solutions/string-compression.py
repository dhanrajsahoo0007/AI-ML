from typing import List


def compress(chars: List[str]) -> int:
    n = len(chars)
    write = 0  # next position to write in the compressed prefix
    i = 0  # read head
    while i < n:
        curr = chars[i]
        count = 0
        while i < n and chars[i] == curr:  # measure full run of ``curr``
            i += 1
            count += 1
        chars[write] = curr
        write += 1
        if count > 1:
            for ch in str(count):  # multi-digit counts split into separate slots
                chars[write] = ch
                write += 1
    return write
