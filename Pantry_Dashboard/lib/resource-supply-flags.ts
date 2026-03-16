import supplyProfiles from '@/src/data/supply_profiles.json';
import type { Resource } from '@/types/resources';

type SupplyProfileRecord = {
  pantry_id?: string;
  metadata?: {
    resource_name?: string;
  };
  flags?: {
    hasFreshProduce?: boolean;
    hasHalal?: boolean;
    hasKosher?: boolean;
    hasMeat?: boolean;
    hasDairy?: boolean;
    hasCanned?: boolean;
    hasGrains?: boolean;
  };
};

const profiles = supplyProfiles as SupplyProfileRecord[];
const profilesWithFlags = profiles.filter((profile) => profile.flags);
const totalProfilesWithFlags = profilesWithFlags.length || 1;

const defaultFlagDistribution = {
  freshProducePct:
    profilesWithFlags.filter((profile) => profile.flags?.hasFreshProduce).length /
    totalProfilesWithFlags,
  meatPct:
    profilesWithFlags.filter((profile) => profile.flags?.hasMeat).length / totalProfilesWithFlags,
  dairyPct:
    profilesWithFlags.filter((profile) => profile.flags?.hasDairy).length / totalProfilesWithFlags,
  grainsPct:
    profilesWithFlags.filter((profile) => profile.flags?.hasGrains).length /
    totalProfilesWithFlags,
  halalPct:
    profilesWithFlags.filter((profile) => profile.flags?.hasHalal).length / totalProfilesWithFlags,
  kosherPct:
    profilesWithFlags.filter((profile) => profile.flags?.hasKosher).length /
    totalProfilesWithFlags,
  cannedPct:
    profilesWithFlags.filter((profile) => profile.flags?.hasCanned).length /
    totalProfilesWithFlags,
};

function findSupplyProfile(resource: Resource) {
  const resourceNameLower = resource.name?.toLowerCase() ?? '';

  return profiles.find(
    (profile) =>
      profile.pantry_id === resource.id ||
      (profile.metadata?.resource_name &&
        resourceNameLower &&
        (profile.metadata.resource_name.toLowerCase().includes(resourceNameLower) ||
          resourceNameLower.includes(profile.metadata.resource_name.toLowerCase().split(' ')[0]))),
  );
}

function computeHash(value: string) {
  return value.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function withResourceSupplyFlags(resource: Resource): Resource {
  const matchedProfile = findSupplyProfile(resource);

  if (matchedProfile?.flags) {
    return {
      ...resource,
      hasFreshProduce: matchedProfile.flags.hasFreshProduce ?? false,
      hasHalal: matchedProfile.flags.hasHalal ?? false,
      hasKosher: matchedProfile.flags.hasKosher ?? false,
      hasMeat: matchedProfile.flags.hasMeat ?? false,
      hasDairy: matchedProfile.flags.hasDairy ?? false,
      hasCanned: matchedProfile.flags.hasCanned ?? false,
      hasGrains: matchedProfile.flags.hasGrains ?? false,
    };
  }

  const hash = computeHash(resource.id);

  return {
    ...resource,
    hasFreshProduce: (hash % 100) < defaultFlagDistribution.freshProducePct * 100,
    hasHalal: (hash % 100) < defaultFlagDistribution.halalPct * 100,
    hasKosher: ((hash + 17) % 100) < defaultFlagDistribution.kosherPct * 100,
    hasMeat: ((hash + 31) % 100) < defaultFlagDistribution.meatPct * 100,
    hasDairy: ((hash + 47) % 100) < defaultFlagDistribution.dairyPct * 100,
    hasCanned: ((hash + 61) % 100) < defaultFlagDistribution.cannedPct * 100,
    hasGrains: ((hash + 79) % 100) < defaultFlagDistribution.grainsPct * 100,
  };
}
