export type TableDensity = 'comfortable' | 'compact';

export interface RiderPreferences {
  density: TableDensity;
}

const PREFIX = 'rider:';
const DEFAULTS: RiderPreferences = { density: 'compact' };

function read(): RiderPreferences {
  try {
    const raw = localStorage.getItem(`${PREFIX}prefs`);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<RiderPreferences>;
    return {
      density: parsed.density === 'comfortable' ? 'comfortable' : 'compact',
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(prefs: RiderPreferences): void {
  try {
    localStorage.setItem(`${PREFIX}prefs`, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

let _cache = read();

export const riderPreferences = {
  get(): RiderPreferences {
    return { ..._cache };
  },
  setDensity(density: TableDensity): RiderPreferences {
    _cache = { ..._cache, density };
    write(_cache);
    document.documentElement.classList.toggle('rider-density-compact', density === 'compact');
    return { ..._cache };
  },
};

document.documentElement.classList.toggle('rider-density-compact', _cache.density === 'compact');
