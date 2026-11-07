// Python side of the Python runner (py.worker.ts): defines __oa_run_case(code, entry, mode, case_json),
// which runs one public case in a fresh namespace with stdout captured and returns a JSON string
// {"ok": true, "actual": …, "logs": "…"} or {"ok": false, "error": "…", "logs": "…"}.
export const PY_HARNESS = String.raw`
import contextlib, io, json, traceback

def __oa_error(e):
    line = None
    for frame in traceback.extract_tb(e.__traceback__):
        if frame.filename == "solution.py":
            line = frame.lineno
    if isinstance(e, SyntaxError) and e.filename == "solution.py":
        line = e.lineno
    text = f"{type(e).__name__}: {e}"
    return f"{text} (line {line})" if line else text

def __oa_run_case(code, entry, mode, case_json):
    case = json.loads(case_json)
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out):
            ns = {"__name__": "__main__"}
            exec(compile(code, "solution.py", "exec"), ns)
            target = ns.get(entry)
            if target is None:
                kind = "class" if mode == "class" else "function"
                raise NameError(f"{entry} is not defined. Keep the {kind} name from the starter code.")
            if mode == "class":
                ops, op_args = case["args"]
                obj, actual = None, []
                for i, (op, a) in enumerate(zip(ops, op_args)):
                    if i == 0:
                        obj = target(*a)
                        actual.append(None)
                    else:
                        actual.append(getattr(obj, op)(*a))
            else:
                actual = target(*case["args"])
        return json.dumps({"ok": True, "actual": actual, "logs": out.getvalue()}, default=repr)
    except BaseException as e:
        return json.dumps({"ok": False, "error": __oa_error(e), "logs": out.getvalue()})
`;
