export interface ProcessedSkill {
  uuid: string;
  skillName: string;
  skillStatement: string;
  categories: string[];
  keywords: string[];
  occupations: { code: string; name: string }[];
  collections: string[];
  publishDate: string;
}

export interface FacetItem {
  name: string;
  count: number;
}

export interface OccupationFacet {
  code: string;
  name: string;
  count: number;
}

export interface Facets {
  categories: FacetItem[];
  collections: FacetItem[];
  occupations: OccupationFacet[];
}
