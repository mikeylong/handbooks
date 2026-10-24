"""Shared semantic rule: only chapter openings may display an eyebrow."""
from reportlab.platypus import Spacer

CHAPTER_MARKER = 'chapter-marker'
LEGACY_EYEBROW_STYLES = frozenset({'CoverKicker', 'ChapterKicker', 'TOCKicker'})


def is_eyebrow(style):
    return bool(getattr(style, 'handbookEyebrow', False) or style.name in LEGACY_EYEBROW_STYLES)


def suppress_eyebrow(style, role=None):
    if role is not None and role != CHAPTER_MARKER:
        raise ValueError(f'Unsupported handbook paragraph role: {role}')
    if role == CHAPTER_MARKER and not is_eyebrow(style):
        raise ValueError('A chapter marker requires an eyebrow style')
    return is_eyebrow(style) and role != CHAPTER_MARKER


class OmittedEyebrow(Spacer):
    """Retain source intent without painting a label or reserving its space."""
    def __init__(self):
        super().__init__(0, 0)


def visible_paragraph(paragraph):
    return not suppress_eyebrow(paragraph.style, getattr(paragraph, '_handbook_role', None))
