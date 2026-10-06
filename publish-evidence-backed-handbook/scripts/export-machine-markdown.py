#!/usr/bin/env python3
"""Export handbook Markdown directives to portable Markdown and a source index."""
import argparse
import hashlib
import json
import re
from pathlib import Path


def digest(data):
    return hashlib.sha256(data).hexdigest()


def slug(text):
    return re.sub(r'[^\w\- ]', '', text.lower()).replace(' ', '-')


def export(source, diagrams, status, companion=None, figures=None, book_id=None, version=None):
    figures = figures or {}
    if figures:
        from screenshot_figures import figure_markdown, validate_placements
    used_figures = []
    lines = source.splitlines()
    if not lines or lines[0] != '---':
        raise ValueError('Source must start with YAML metadata')
    front_end = lines.index('---', 1)
    metadata = dict(line.split(':', 1) for line in lines[1:front_end] if ':' in line)
    title = metadata['title'].strip()
    out = lines[:front_end] + [
        'format: "machine-readable-markdown-v1"',
        'publication_status: "candidate"',
        f'native_execution_status: {json.dumps(status)}',
        'content_role: "reader guidance; not an execution record"',
        f'source_sha256: "{digest(source.encode())}"',
        '---', '', f'# {title}', ''
    ]
    if companion:
        out += [f'Companion reader package: [{Path(companion).name}]({companion}).', '']
    out += ['## Contents', '', '@@CONTENTS@@', '']
    index = {'schemaVersion': 1, 'sourceSha256': digest(source.encode()),
             'nativeExecutionStatus': status, 'sections': [], 'prompts': [],
             'diagrams': [], 'figures': [], 'callouts': [], 'worksheets': [], 'stopConditionExcerpts': [], 'commands': []}
    seen = {}
    chapter = None
    pending = None
    section = None
    copied = []
    transformations = []
    toc = []
    i = front_end + 1

    def heading(level, text, line, identity=None):
        nonlocal section
        anchor = slug(text)
        n = seen.get(anchor, 0)
        seen[anchor] = n + 1
        if n:
            anchor += f'-{n}'
        section = identity or anchor
        out.append('#' * level + ' ' + text)
        item = {'id': section, 'title': text, 'level': level, 'anchor': anchor,
                'chapter': chapter, 'sourceLine': line, 'markdownLine': len(out)}
        index['sections'].append(item)
        if level == 2:
            toc.append(f'{len(toc) + 1}. [{text}](#{anchor})')

    while i < len(lines):
        line = lines[i]
        if line == '<pagebreak>':
            transformations.append({'sourceLine': i + 1, 'kind': 'remove-page-break'})
            i += 1
            continue
        marker = re.fullmatch(r'<!-- CHAPTER (\d+) \| (.*?) \| (.*?) -->', line)
        if marker:
            pending = marker.groups()
            transformations.append({'sourceLine': i + 1, 'kind': 'chapter-metadata'})
            i += 1
            continue
        figure = re.fullmatch(r'<!-- FIGURE ([A-Za-z0-9][A-Za-z0-9-]*) -->', line.strip())
        if figure:
            key = figure[1]
            if key not in figures:
                raise ValueError(f'Unknown screenshot figure ID: {key}')
            used_figures.append(key)
            out += ['', figure_markdown(figures[key], book_id, version), '']
            index['figures'].append({'id': key, 'sourceLine': i + 1, 'caption': figures[key]['caption']})
            transformations.append({'sourceLine': i + 1, 'kind': 'screenshot-figure'})
            i += 1
            continue
        diagram = re.fullmatch(r'<!-- DIAGRAM ([\w-]+) -->', line)
        if diagram:
            key = diagram[1]
            if key not in diagrams:
                raise ValueError(f'Missing diagram definition: {key}')
            definition = diagrams[key]
            ids = {node['id'] for node in definition['nodes']}
            if len(ids) != len(definition['nodes']):
                raise ValueError(f'Duplicate diagram node: {key}')
            if any(edge['from'] not in ids or edge['to'] not in ids for edge in definition['edges']):
                raise ValueError(f'Unknown diagram edge: {key}')
            heading(3, f'Diagram: {key}', i + 1)
            out += ['', definition.get('printAlt', definition['title']), '',
                    '| Node | Label | Detail |', '|---|---|---|']
            def cell(value):
                return str(value).replace('|', '\\|').replace('\n', ' ')
            for node in definition['nodes']:
                out.append(f"| {cell(node['id'])} | {cell(node['label'])} | {cell(node.get('detail', ''))} |")
            out += ['', '| From | To | Relationship |', '|---|---|---|']
            for edge in definition['edges']:
                out.append(f"| {cell(edge['from'])} | {cell(edge['to'])} | {'feedback' if edge.get('feedback') else 'forward'} |")
            if definition.get('printCaption'):
                out += ['', definition['printCaption']]
            if definition.get('note') and definition['note'] != definition.get('printCaption'):
                out += ['', definition['note']]
            out.append('')
            index['diagrams'].append({'id': key, 'sourceLine': i + 1, 'definition': definition})
            transformations.append({'sourceLine': i + 1, 'kind': 'diagram-text-equivalent'})
            i += 1
            continue
        directive = re.fullmatch(r'::: (callout|worksheet) (.*)', line)
        if directive:
            start = i
            kind, title = directive.groups()
            variant = None
            if kind == 'callout':
                variant, title = title.split(' | ', 1)
            i += 1
            body = []
            while i < len(lines) and lines[i] != ':::':
                if lines[i].startswith(':::'):
                    raise ValueError('Nested or unsupported block directive')
                body.append(lines[i])
                copied.append(i + 1)
                i += 1
            if i == len(lines):
                raise ValueError('Unclosed ' + kind)
            parent = section
            label = 'Worksheet: ' if kind == 'worksheet' else f'Callout ({variant}): '
            heading(4, label + title, start + 1)
            out += ['', *body, '']
            index['worksheets' if kind == 'worksheet' else 'callouts'].append({
                'title': title, 'variant': variant, 'section': parent,
                'sourceStartLine': start + 1, 'sourceEndLine': i + 1,
                'body': '\n'.join(body)})
            section = parent
            transformations.append({'sourceLine': start + 1, 'kind': kind + '-markdown', 'endLine': i + 1})
            i += 1
            continue
        prompt = re.fullmatch(r'::: prompt (.*?) \| (.*)', line)
        if prompt:
            start = i
            i += 1
            body = []
            while i < len(lines) and lines[i] != ':::':
                body.append(lines[i])
                i += 1
            if i == len(lines):
                raise ValueError('Unclosed prompt')
            number = len(index['prompts']) + 1
            parent = section
            heading(4, f'Prompt {number:02d}: {prompt[1]} | {prompt[2]}', start + 1, f'prompt-{number:02d}')
            fence = '`' * max(3, 1 + max([len(s) for s in re.findall(r'`+', '\n'.join(body))] or [0]))
            out += ['', fence + 'text']
            body_line = len(out) + 1
            out += body + [fence, '']
            index['prompts'].append({'id': f'prompt-{number:02d}', 'tool': prompt[1],
                'title': prompt[2], 'chapter': chapter, 'section': parent,
                'sourceStartLine': start + 2, 'sourceEndLine': i,
                'markdownStartLine': body_line, 'markdownEndLine': body_line + len(body) - 1,
                'body': '\n'.join(body), 'sha256': digest('\n'.join(body).encode())})
            section = parent
            transformations.append({'sourceLine': start + 1, 'kind': 'prompt-fence', 'endLine': i + 1})
            i += 1
            continue
        if line.startswith('```') or line.startswith('~~~'):
            start = i
            opening = re.match(r'(`{3,}|~{3,})(.*)', line)
            fence, language = opening.groups()
            body = []
            out.append(line)
            copied.append(i + 1)
            i += 1
            while i < len(lines) and not re.fullmatch(re.escape(fence[0]) + '{' + str(len(fence)) + ',}\\s*', lines[i]):
                body.append(lines[i])
                out.append(lines[i])
                copied.append(i + 1)
                i += 1
            if i == len(lines):
                raise ValueError('Unclosed code fence')
            out.append(lines[i])
            copied.append(i + 1)
            index['commands'].append({'section': section, 'language': language.strip(),
                'sourceLine': start + 1, 'body': '\n'.join(body)})
            i += 1
            continue
        match = re.match(r'^(#{1,5}) (.*)', line)
        if match:
            level, text = len(match[1]) + 1, match[2]
            identity = None
            if level == 2:
                if pending:
                    number, expected, summary = pending
                    if text != expected:
                        raise ValueError('Chapter marker and heading disagree')
                    chapter = f'chapter-{number}'
                    identity = chapter
                    text = f'Chapter {number}: {text}'
                    heading(level, text, i + 1, identity)
                    index['sections'][-1]['summary'] = summary
                    out += ['', summary]
                    pending = None
                else:
                    chapter = None
                    heading(level, text, i + 1)
            else:
                if text == 'Chapter checkpoint' and chapter:
                    text = f'Chapter {chapter[-2:]} checkpoint'
                heading(level, text, i + 1)
            transformations.append({'sourceLine': i + 1, 'kind': 'heading'})
        else:
            if line.startswith(':::') or re.match(r'<(?:!--|pagebreak)', line):
                raise ValueError(f'Unsupported directive at line {i + 1}')
            out.append(line)
            copied.append(i + 1)
            if re.search(r'\bstop\b', line, re.I):
                index['stopConditionExcerpts'].append({'section': section,
                    'sourceLine': i + 1, 'text': line})
        i += 1
    if pending:
        raise ValueError('Chapter marker has no heading')
    if figures:
        validate_placements(figures, used_figures)
    at = out.index('@@CONTENTS@@')
    out[at:at + 1] = toc
    shift = len(toc) - 1
    for item in index['sections']:
        item['markdownLine'] += shift
    for item in index['prompts']:
        item['markdownStartLine'] += shift
        item['markdownEndLine'] += shift
    for n, item in enumerate(index['sections']):
        following = next((s for s in index['sections'][n + 1:] if s['level'] <= item['level']), None)
        item['markdownEndLine'] = following['markdownLine'] - 1 if following else len(out)
        item['role'] = ('prompt' if item['id'].startswith('prompt-') else
                        'checkpoint' if item['title'].endswith('checkpoint') else
                        'phase' if item['title'].startswith('Phase ') else 'section')
    result = '\n'.join(out).rstrip() + '\n'
    index['markdownSha256'] = digest(result.encode())
    index['transformations'] = transformations
    index['verbatimSourceLines'] = copied
    return result, index


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--diagram', action='append', default=[], metavar='ID=JSON_PATH')
    parser.add_argument('--native-status', default='unverified')
    parser.add_argument('--companion', help='Package path relative to the Markdown output directory')
    parser.add_argument('--figures', type=Path, help='Book-owned screenshot figure manifest')
    parser.add_argument('--book-root', type=Path, help='Root for frozen screenshot assets')
    parser.add_argument('--book-id', help='Public handbook slug for immutable screenshot links')
    parser.add_argument('--version', help='Content edition for immutable screenshot links')
    args = parser.parse_args()
    if args.source.resolve() == args.output.resolve():
        raise ValueError('Export must not overwrite the manuscript')
    diagrams = {}
    for value in args.diagram:
        key, path = value.split('=', 1)
        diagrams[key] = json.loads(Path(path).read_text())
    figures = {}
    if args.figures:
        from screenshot_figures import load_figures
        if not args.book_root or not args.book_id or not args.version:
            raise ValueError('Screenshot export requires --book-root, --book-id and --version')
        manifest = args.figures.resolve().relative_to(args.book_root.resolve())
        figures = load_figures(args.book_root, str(manifest), required=True)
    content, index = export(args.source.read_text(), diagrams, args.native_status, args.companion, figures, args.book_id, args.version)
    if args.companion:
        package = args.output.parent / args.companion
        if not package.is_file():
            raise ValueError('Companion package does not exist at the supplied relative path')
        index['companionPackage'] = {'path': args.companion, 'sha256': digest(package.read_bytes())}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content)
    index_path = args.output.with_suffix('.index.json')
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'markdown': str(args.output), 'index': str(index_path),
                      'chapters': sum(s['level'] == 2 and s['id'].startswith('chapter-') for s in index['sections']),
                      'prompts': len(index['prompts']), 'sha256': index['markdownSha256']}))


if __name__ == '__main__':
    main()
