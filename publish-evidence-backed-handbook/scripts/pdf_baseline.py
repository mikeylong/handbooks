"""Verify a frozen release input and distinguish content editions from companions."""
import hashlib
import re
from pathlib import Path
from pypdf import PdfReader
from pypdf.generic import NameObject

MODES = ('content-edition', 'appearance-companion')


def load_baseline(book, config):
    value = config.get('releasedPdf')
    mode = config.get('baselineMode')
    if mode is not None and mode not in MODES:
        raise ValueError('Unknown PDF baselineMode')
    if not value:
        if mode is not None or config.get('releasedSha256'):
            raise ValueError('PDF baseline mode/hash requires releasedPdf')
        return None, None
    # Historical configs describe appearance migrations. Never infer an edition.
    mode = mode or 'appearance-companion'
    sha = config.get('releasedSha256')
    if not isinstance(sha, str) or not re.fullmatch(r'[a-f0-9]{64}', sha):
        raise ValueError('Missing or invalid releasedSha256')
    relative = Path(value)
    if relative.is_absolute() or '..' in relative.parts or '\\' in value:
        raise ValueError('Unsafe releasedPdf path')
    book = Path(book).resolve()
    path = book / relative
    if path.is_symlink() or not path.resolve().is_relative_to(book) or not path.is_file():
        raise ValueError('releasedPdf must be a regular file within the book')
    if hashlib.sha256(path.read_bytes()).hexdigest() != sha:
        raise ValueError('releasedSha256 mismatch')
    return mode, PdfReader(path, strict=True)


def preserve_companion_labels(writer, reader, mode, baseline):
    """Return whether labels were retained; editions create their own labels."""
    if mode != 'appearance-companion':
        return False
    if len(reader.pages) != len(baseline.pages):
        raise ValueError(f'Pagination mismatch: {len(reader.pages)} != {len(baseline.pages)}')
    labels = baseline.trailer['/Root'].get('/PageLabels')
    if labels is not None:
        writer._root_object[NameObject('/PageLabels')] = labels.get_object().clone(writer)
    else:
        # A release with implicit decimal labels must keep that identity too.
        writer._root_object.pop('/PageLabels', None)
    return True
