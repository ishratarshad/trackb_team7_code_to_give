import povertyData from '@/src/data/nyc_poverty_2017_21.json';

type NycBoroughName = 'Bronx' | 'Brooklyn' | 'Manhattan' | 'Queens' | 'Staten Island';

type PovertyNeighborhoodRecord = {
  geoId: string;
  geography: string;
  borough: NycBoroughName;
  percent: number;
};

type PovertyDataset = {
  sourceFile: string;
  timePeriod: string;
  neighborhoods: PovertyNeighborhoodRecord[];
  boroughs: Record<NycBoroughName, number>;
};

type PovertyNeighborhoodEntry = PovertyNeighborhoodRecord & {
  aliases: string[];
};

export type NycPovertyMatch = {
  geography: string;
  percent: number;
  level: 'neighborhood' | 'borough';
};

type PovertyLookupInput = {
  borough?: string | null;
  name?: string | null;
  description?: string | null;
  address?: string | null;
  streetAddress?: string | null;
};

const BOROUGH_NAME_BY_KEY: Record<string, NycBoroughName> = {
  bronx: 'Bronx',
  brooklyn: 'Brooklyn',
  manhattan: 'Manhattan',
  queens: 'Queens',
  'staten island': 'Staten Island',
  'staten-island': 'Staten Island',
};

const MANUAL_ALIASES_BY_GEO_ID: Record<string, string[]> = {
  '610302': ['les'],
  '850101': ['st george'],
};

const dataset = povertyData as PovertyDataset;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[.'"]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collapseNormalizedText(value: string) {
  return normalizeText(value).replace(/\s+/g, '');
}

function stripParentheticalText(value: string) {
  return value.replace(/\([^)]*\)/g, ' ');
}

function addAlias(aliases: Set<string>, value: string) {
  const normalized = normalizeText(value);

  if (!normalized || normalized.length < 4) {
    return;
  }

  aliases.add(normalized);
}

function buildAliases(record: PovertyNeighborhoodRecord) {
  const aliases = new Set<string>();
  const variants = [
    record.geography,
    stripParentheticalText(record.geography),
  ];

  variants.forEach((variant) => {
    addAlias(aliases, variant);

    variant
      .split(/[-/]/)
      .map((segment) => stripParentheticalText(segment).trim())
      .forEach((segment) => addAlias(aliases, segment));
  });

  (MANUAL_ALIASES_BY_GEO_ID[record.geoId] ?? []).forEach((alias) => addAlias(aliases, alias));

  return Array.from(aliases);
}

function toCanonicalBoroughName(value?: string | null): NycBoroughName | null {
  if (!value) {
    return null;
  }

  return BOROUGH_NAME_BY_KEY[normalizeText(value)] ?? null;
}

function buildSearchFields(input: PovertyLookupInput) {
  return [
    { text: normalizeText(input.name ?? ''), collapsed: collapseNormalizedText(input.name ?? ''), weight: 5 },
    { text: normalizeText(input.description ?? ''), collapsed: collapseNormalizedText(input.description ?? ''), weight: 4 },
    { text: normalizeText(input.address ?? ''), collapsed: collapseNormalizedText(input.address ?? ''), weight: 3 },
    { text: normalizeText(input.streetAddress ?? ''), collapsed: collapseNormalizedText(input.streetAddress ?? ''), weight: 2 },
  ].filter((field) => Boolean(field.text));
}

function buildAliasLookup(entries: PovertyNeighborhoodEntry[]) {
  const next = new Map<string, PovertyNeighborhoodEntry[]>();

  entries.forEach((entry) => {
    entry.aliases.forEach((alias) => {
      next.set(alias, [...(next.get(alias) ?? []), entry]);
    });
  });

  return next;
}

const neighborhoodEntriesByBorough = new Map<NycBoroughName, PovertyNeighborhoodEntry[]>();

dataset.neighborhoods.forEach((record) => {
  const entry: PovertyNeighborhoodEntry = {
    ...record,
    aliases: buildAliases(record),
  };
  const entries = neighborhoodEntriesByBorough.get(record.borough) ?? [];
  entries.push(entry);
  neighborhoodEntriesByBorough.set(record.borough, entries);
});

const aliasLookupByBorough = new Map<NycBoroughName, Map<string, PovertyNeighborhoodEntry[]>>();

neighborhoodEntriesByBorough.forEach((entries, borough) => {
  aliasLookupByBorough.set(borough, buildAliasLookup(entries));
});

function findNeighborhoodMatch(input: PovertyLookupInput, borough: NycBoroughName) {
  const fields = buildSearchFields(input);
  const aliasLookup = aliasLookupByBorough.get(borough);

  if (!aliasLookup || !fields.length) {
    return null;
  }

  let bestMatch: { entry: PovertyNeighborhoodEntry; score: number } | null = null;

  for (const [alias, entries] of aliasLookup.entries()) {
    // Do not pick an arbitrary sub-neighborhood when the alias matches multiple rows.
    if (entries.length !== 1) {
      continue;
    }

    for (const field of fields) {
      const collapsedAlias = alias.replace(/\s+/g, '');
      const hasWordBoundaryMatch = (` ${field.text} `).includes(` ${alias} `);
      const hasCollapsedMatch =
        collapsedAlias.length >= 6 && field.collapsed.includes(collapsedAlias);

      if (!hasWordBoundaryMatch && !hasCollapsedMatch) {
        continue;
      }

      const score =
        field.weight * 100 +
        alias.split(' ').length * 12 +
        alias.length +
        (hasWordBoundaryMatch ? 18 : 0);
      const nextMatch = {
        entry: entries[0],
        score,
      };

      if (!bestMatch || nextMatch.score > bestMatch.score) {
        bestMatch = nextMatch;
      }
    }
  }

  if (!bestMatch) {
    return null;
  }

  return {
    geography: bestMatch.entry.geography,
    percent: bestMatch.entry.percent,
    level: 'neighborhood' as const,
  };
}

export function lookupNycPovertyRate(input: PovertyLookupInput): NycPovertyMatch | null {
  const borough = toCanonicalBoroughName(input.borough);

  if (!borough) {
    return null;
  }

  const neighborhoodMatch = findNeighborhoodMatch(input, borough);

  if (neighborhoodMatch) {
    return neighborhoodMatch;
  }

  const boroughPercent = dataset.boroughs[borough];

  if (typeof boroughPercent !== 'number') {
    return null;
  }

  return {
    geography: borough,
    percent: boroughPercent,
    level: 'borough',
  };
}
