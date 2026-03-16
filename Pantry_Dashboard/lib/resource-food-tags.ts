import type { Resource } from '@/types/resources';

type ResourceFoodFlags = Pick<
  Resource,
  | 'hasFreshProduce'
  | 'hasDairy'
  | 'hasMeat'
  | 'hasGrains'
  | 'hasCanned'
  | 'hasHalal'
  | 'hasKosher'
>;

export type ResourceFoodTag = {
  key: keyof ResourceFoodFlags;
  label: string;
  bgColor: string;
  textColor: string;
};

const FOOD_TAG_CONFIG: ResourceFoodTag[] = [
  {
    key: 'hasFreshProduce',
    label: 'Fresh Produce',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
  {
    key: 'hasDairy',
    label: 'Dairy',
    bgColor: 'bg-sky-100',
    textColor: 'text-sky-700',
  },
  {
    key: 'hasMeat',
    label: 'Meat',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-700',
  },
  {
    key: 'hasGrains',
    label: 'Grains',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  {
    key: 'hasCanned',
    label: 'Canned',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  {
    key: 'hasHalal',
    label: 'Halal',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-700',
  },
  {
    key: 'hasKosher',
    label: 'Kosher',
    bgColor: 'bg-violet-100',
    textColor: 'text-violet-700',
  },
];

export function getResourceFoodTags(resource: ResourceFoodFlags) {
  return FOOD_TAG_CONFIG.filter((tag) => Boolean(resource[tag.key]));
}
