#!/usr/bin/env python3
"""Compute jump links to diff lines of a GitLab MR / GitHub PR and check whether a line is visible in the diff.

Usage:
  python diff_anchor.py gitlab <mr_url> <mr.diff|diffs.json> <spec> [<spec> ...]
  python diff_anchor.py github <pr_url> <pr.diff>            <spec> [<spec> ...]
  python diff_anchor.py dump <diffs.json>                    readable unified diff on stdout (fallback)

<mr.diff>     Unified diff: GitLab `glab api "projects/<id>/merge_requests/<iid>/raw_diffs"` (preferred, also
              contains collapsed files), GitHub `gh pr diff <pr_url>`
<diffs.json>  Output of `glab api --paginate "projects/<id>/merge_requests/<iid>/diffs?per_page=100"`
              (several concatenated JSON arrays are fine, so is the compare API format {"diffs": [...]}).
              Note: collapsed files have an empty diff there.
The format is detected automatically (JSON or unified diff).

spec:  path:123       new line 123 (right side)
       path:123-127   range, the link points to the first line
       path:-45       deleted line 45 (left side)
       path:-45-47    range on the left side

Output per spec, tab-separated: spec, status, url, code of the first line (for the content check of the anchor)
  status: added | context | removed  -> line is in the diff, a comment can go there
          outside                    -> file is in the diff, the line is not (URL only points to the file)
          no-file                    -> file is not in the diff
          invalid-spec               -> spec could not be parsed
  For ranges with lines outside the diff ",partly-outside" is appended.

GitLab anchor: <mr>/diffs#<sha1(path)>_<old>_<new>. For added lines <old> is the value of the old-line
counter at that point (new file -> 0). Verified against real DiffNote positions.
Renamed files are always hashed by their new path.
GitHub anchor: <pr>/files#diff-<sha256(path)>R<new> or L<old>.
"""
import hashlib
import json
import re
import sys

HUNK = re.compile(r'^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@')
FLAGS = ('new_file', 'deleted_file', 'renamed_file', 'too_large', 'collapsed', 'generated_file')


def fail(message, code=2):
    print(message, file=sys.stderr)
    sys.exit(code)


def parse_hunks(diff_text):
    new_map, old_map = {}, {}
    old = new = 0
    in_hunk = False
    for raw in diff_text.split('\n'):
        m = HUNK.match(raw)
        if m:
            old, new = int(m.group(1)), int(m.group(2))
            in_hunk = True
            continue
        if not in_hunk or raw == '' or raw.startswith('\\'):
            continue
        tag, code = raw[0], raw[1:].rstrip('\r').replace('\t', '    ')
        if tag == '+':
            new_map[new] = ('added', old, new, code)
            new += 1
        elif tag == '-':
            old_map[old] = ('removed', old, new, code)
            old += 1
        else:
            new_map[new] = ('context', old, new, code)
            old_map[old] = ('context', old, new, code)
            old += 1
            new += 1
    return new_map, old_map


def load_diff_file(diff_file):
    text = open(diff_file, encoding='utf-8', errors='replace').read()
    if text.lstrip()[:1] in ('[', '{'):
        return [(i.get('old_path'), i.get('new_path'), i.get('diff') or '') for i in load_gitlab_items(text)]
    return load_unified_files(text)


def load_gitlab_items(text):
    decoder = json.JSONDecoder()
    idx, items = 0, []
    while idx < len(text):
        while idx < len(text) and text[idx].isspace():
            idx += 1
        if idx >= len(text):
            break
        obj, idx = decoder.raw_decode(text, idx)
        if isinstance(obj, dict):
            if 'diffs' in obj or 'changes' in obj:
                obj = obj.get('diffs') or obj.get('changes')
            elif 'diff' not in obj:
                fail(f'API error instead of a diff: {json.dumps(obj)[:300]}', 1)
            else:
                obj = [obj]
        items.extend(obj)
    return items


def unquote(path):
    path = path.rstrip('\r').rstrip('\t')
    if len(path) >= 2 and path[0] == '"' and path[-1] == '"':
        path = path[1:-1]
        if path.isascii():
            path = path.encode('ascii').decode('unicode_escape').encode('latin-1').decode('utf-8', 'replace')
    return path


def strip_prefix(path, prefix):
    return path[len(prefix):] if path.startswith(prefix) else path


def paths_from_git_header(rest):
    if rest.endswith('"'):
        m = re.match(r'^(".*?"|\S+) (".*")$', rest)
        if m:
            return strip_prefix(unquote(m.group(1)), 'a/'), strip_prefix(unquote(m.group(2)), 'b/')
    half = (len(rest) - 3) // 2
    if rest[half:half + 3] == ' b/':
        return strip_prefix(rest[:half], 'a/'), rest[half + 3:]
    old, _, new = rest.rpartition(' b/')
    return strip_prefix(old, 'a/'), new


def load_unified_files(text):
    files, cur, seen_hunk = [], None, False
    for line in text.split('\n'):
        line = line.rstrip('\r')
        if line.startswith('diff --git '):
            old, new = paths_from_git_header(line[len('diff --git '):])
            cur = {'old': old, 'new': new, 'lines': []}
            files.append(cur)
            seen_hunk = False
            continue
        if cur is None:
            continue
        if not seen_hunk:
            if line.startswith('--- '):
                target = unquote(line[4:])
                cur['old'] = None if target == '/dev/null' else strip_prefix(target, 'a/')
                continue
            if line.startswith('+++ '):
                target = unquote(line[4:])
                if target != '/dev/null':
                    cur['new'] = strip_prefix(target, 'b/')
                continue
            if not line.startswith('@@'):
                continue
            seen_hunk = True
        cur['lines'].append(line)
    return [(f['old'], f['new'] or f['old'], '\n'.join(f['lines'])) for f in files]


def parse_spec(spec):
    path, _, lines = spec.rpartition(':')
    if not path:
        raise ValueError(spec)
    old_side = lines.startswith('-')
    lines = lines[1:] if old_side else lines
    first, _, last = lines.partition('-')
    first = int(first)
    path = strip_prefix(path.replace('\\', '/'), './')
    return path, old_side, first, int(last) if last else first


def dump(diff_file):
    items = load_gitlab_items(open(diff_file, encoding='utf-8', errors='replace').read())
    for item in items:
        print(f"diff --git a/{item.get('old_path')} b/{item.get('new_path')}")
        flags = [k for k in FLAGS if item.get(k)]
        if flags:
            print('# flags: ' + ', '.join(flags))
        diff = item.get('diff') or ''
        if diff:
            print(diff.rstrip('\n'))


def main():
    if len(sys.argv) == 3 and sys.argv[1] == 'dump':
        dump(sys.argv[2])
        return
    if len(sys.argv) < 5 or sys.argv[1] not in ('gitlab', 'github'):
        fail(__doc__)
    platform, url, diff_file, specs = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:]
    pattern = r'^(.*?/-/merge_requests/\d+)' if platform == 'gitlab' else r'^(.*?/pull/\d+)'
    m = re.match(pattern, url)
    files = load_diff_file(diff_file)
    if not m:
        fail(f'URL not recognized: {url}\n\n{__doc__}')
    base = m.group(1)
    if not files:
        print(f'Warning: no files found in {diff_file}', file=sys.stderr)

    by_path = {}
    for old_path, new_path, diff in files:
        canon = new_path or old_path
        entry = (canon, parse_hunks(diff))
        by_path[canon] = entry
        if old_path and old_path != canon:
            by_path.setdefault(old_path, entry)

    for spec in specs:
        try:
            path, old_side, first, last = parse_spec(spec)
        except ValueError:
            print(f'{spec}\tinvalid-spec\t-')
            continue
        if path not in by_path:
            print(f'{spec}\tno-file\t{base}')
            continue

        canon, (new_map, old_map) = by_path[path]
        if platform == 'gitlab':
            file_anchor = f'{base}/diffs#{hashlib.sha1(canon.encode()).hexdigest()}'
        else:
            file_anchor = f'{base}/files#diff-{hashlib.sha256(canon.encode()).hexdigest()}'

        line_map = old_map if old_side else new_map
        hit = line_map.get(first)
        if not hit:
            print(f'{spec}\toutside\t{file_anchor}')
            continue

        status, old, new, code = hit
        partly = any(n not in line_map for n in range(first, last + 1))
        if platform == 'gitlab':
            link = f'{file_anchor}_{old}_{new}'
        else:
            link = f'{file_anchor}{"L" if old_side else "R"}{first}'
        print(f'{spec}\t{status}{",partly-outside" if partly else ""}\t{link}\t{code.strip()[:120]}')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
