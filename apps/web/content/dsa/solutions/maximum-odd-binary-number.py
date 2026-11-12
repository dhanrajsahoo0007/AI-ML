def maximum_odd_binary_number(s: str) -> str:
    count_ones = s.count("1")
    count_zeros = len(s) - count_ones
    return "1" * (count_ones - 1) + "0" * count_zeros + "1"
