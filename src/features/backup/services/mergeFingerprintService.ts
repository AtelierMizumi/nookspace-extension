/**
 * Deterministic fingerprint generators for entity duplicate detection.
 * Fingerprints are lowercase, trimmed, and independent of volatile runtime fields.
 */

export function normalizeUrl(rawUrl: string): string {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';
    // Normalize protocol and host
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.replace(/\/+$/, '');
    return `${parsed.protocol}//${host}${pathname}${parsed.search}`;
  } catch {
    return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
  }
}

export function computeEntityFingerprint(table: string, entity: any): string {
  if (!entity || typeof entity !== 'object') {
    return '';
  }

  switch (table) {
    case 'bookmarks': {
      const url = normalizeUrl(entity.url || '');
      const title = (entity.title || '').trim().toLowerCase();
      return `bm:${url}::${title}`;
    }

    case 'bookmarkGroups': {
      const title = (entity.title || entity.name || '').trim().toLowerCase();
      return `bg:${title}`;
    }

    case 'notes': {
      const title = (entity.title || '').trim().toLowerCase();
      const content = (entity.content || '').trim();
      return `nt:${title}::${content}`;
    }

    case 'noteCollections': {
      const title = (entity.title || entity.name || '').trim().toLowerCase();
      return `nc:${title}`;
    }

    case 'noteTags': {
      const name = (entity.name || entity.title || '').trim().toLowerCase();
      return `ntag:${name}`;
    }

    case 'noteBookmarkLinks': {
      // Fingerprint combines noteId + bookmarkId
      return `nbl:${entity.noteId || ''}::${entity.bookmarkId || ''}`;
    }

    case 'todos': {
      const title = (entity.title || '').trim().toLowerCase();
      const due = entity.dueDate ? String(entity.dueDate) : '';
      return `td:${title}::${due}`;
    }

    case 'workspaces': {
      const name = (entity.name || '').trim().toLowerCase();
      const icon = (entity.icon || '').trim().toLowerCase();
      return `ws:${name}::${icon}`;
    }

    case 'widgetInstances': {
      const widgetType = (entity.widgetType || '').trim().toLowerCase();
      const title = (entity.title || '').trim().toLowerCase();
      return `wi:${widgetType}::${title}`;
    }

    case 'widgetLayouts': {
      const breakpoint = (entity.breakpoint || '').trim();
      const instanceId = (entity.widgetInstanceId || '').trim();
      return `wl:${breakpoint}::${instanceId}`;
    }

    case 'focusSessions': {
      const type = (entity.type || '').trim().toLowerCase();
      const start = entity.startedAt || 0;
      const end = entity.completedAt || 0;
      const dur = entity.durationMinutes || 0;
      return `fs:${type}::${start}::${end}::${dur}`;
    }

    case 'dailyGoals': {
      const type = (entity.type || '').trim().toLowerCase();
      const date = (entity.dateString || '').trim();
      return `dg:${type}::${date}`;
    }

    case 'stickyNotes': {
      const content = (entity.content || '').trim();
      return `sn:${content}`;
    }

    case 'vocabulary': {
      const word = (entity.word || '').trim().toLowerCase();
      const def = (entity.definition || '').trim().toLowerCase();
      return `voc:${word}::${def}`;
    }

    case 'resources': {
      const url = normalizeUrl(entity.url || '');
      const title = (entity.title || '').trim().toLowerCase();
      return `res:${url}::${title}`;
    }

    case 'calendarEvents': {
      const title = (entity.title || '').trim().toLowerCase();
      const start = entity.startDate || '';
      return `ev:${title}::${start}`;
    }

    case 'settings': {
      return 'settings:current_settings';
    }

    default:
      return `${table}:${entity.id || ''}`;
  }
}
