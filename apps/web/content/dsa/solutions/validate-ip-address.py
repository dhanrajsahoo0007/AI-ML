def valid_ip_address(queryIP: str) -> str:
    if "." in queryIP:
        parts = queryIP.split(".")
        if len(parts) != 4:
            return "Neither"
        for p in parts:
            if not p or not p.isdigit():
                return "Neither"
            if len(p) > 1 and p[0] == "0":
                return "Neither"
            val = int(p)
            if val > 255:
                return "Neither"
        return "IPv4"
    if ":" not in queryIP:
        return "Neither"

    def is_hex_block(block: str) -> bool:
        if not (1 <= len(block) <= 4):
            return False
        hex_digits = set("0123456789abcdefABCDEF")
        return all(c in hex_digits for c in block)

    if "::" in queryIP:
        if queryIP.count("::") != 1:
            return "Neither"
        left, right = queryIP.split("::", 1)
        left_parts = left.split(":") if left else []
        right_parts = right.split(":") if right else []
        if "" in left_parts or "" in right_parts:  # ":::" or a stray ":" next to "::"
            return "Neither"
        if len(left_parts) + len(right_parts) > 7:
            return "Neither"
        for block in left_parts + right_parts:
            if not is_hex_block(block):
                return "Neither"
        return "IPv6"

    parts = queryIP.split(":")
    if len(parts) != 8:
        return "Neither"
    for block in parts:
        if not is_hex_block(block):
            return "Neither"
    return "IPv6"
