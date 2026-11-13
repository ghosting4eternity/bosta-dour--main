import { PALETTE } from './palette';
import { mixHexColor, smoothstep } from './perspective';
import type { DistrictSegmentDef, MapId } from './types';

export interface SampledEnvironment {
  district: DistrictSegmentDef;
  skyTop: string;
  skyBottom: string;
  fogColor: string;
  skylineColor: string;
  terrainColor: string;
  roadColor: string;
  roadAltColor: string;
  curbColor: string;
  foliageColor: string;
  hillSlope: number;
  roadScale: number;
}

export const DHAKA_DISTRICTS: DistrictSegmentDef[] = [
  {
    id: 'dhaka_sadarghat',
    name: 'Sadarghat',
    nameBn: 'সদরঘাট',
    subtitle: 'Buriganga Riverfront & Launch Terminal Heritage',
    startX: 0,
    endX: 60,
    skyTop: '#B9DCF2',
    skyBottom: '#F9EED7',
    fogColor: '#EFE4CE',
    skylineColor: '#9BB0C4',
    terrainColor: '#D6C7AF',
    roadColor: '#2B2F38',
    roadAltColor: '#373D48',
    curbColor: PALETTE.curbBrick,
    foliageColor: PALETTE.emeraldGreen,
    hillSlope: 0,
    roadScale: 0.96,
    trafficDensity: 0.9,
    archTheme: 'riverfront',
    signsBn: ['সদরঘাট টার্মিনাল', 'বুড়িগঙ্গা লঞ্চ', 'নৌ-পথ ভান্ডার'],
    treeWeights: ['COCONUT_TREE', 'BANYAN_TREE', 'MANGO_TREE'],
  },
  {
    id: 'dhaka_old_dhaka',
    name: 'Old Dhaka',
    nameBn: 'পুরান ঢাকা',
    subtitle: 'Lalbagh Mughal Lanes, Terracotta Arches & Spice Markets',
    startX: 60,
    endX: 110,
    skyTop: '#C5DFEF',
    skyBottom: '#FAECD3',
    fogColor: '#EFE0C9',
    skylineColor: '#A69D96',
    terrainColor: '#D8C4AA',
    roadColor: '#2E3038',
    roadAltColor: '#3B3E48',
    curbColor: PALETTE.curbBrick,
    foliageColor: '#047857',
    hillSlope: 0,
    roadScale: 0.95,
    trafficDensity: 1.05,
    archTheme: 'old_town',
    signsBn: ['পুরান ঢাকা', 'চকবাজার', 'লালবাগ কেল্লা'],
    treeWeights: ['BANYAN_TREE', 'MANGO_TREE', 'PALM_TREE'],
  },
  {
    id: 'dhaka_motijheel',
    name: 'Motijheel',
    nameBn: 'মতিঝিল',
    subtitle: 'Financial Core & Commercial High-Rises',
    startX: 110,
    endX: 160,
    skyTop: '#BCDDF2',
    skyBottom: '#FBF2DE',
    fogColor: '#EAE5D8',
    skylineColor: '#8EA3B8',
    terrainColor: '#CEC8BC',
    roadColor: '#262A32',
    roadAltColor: '#323742',
    curbColor: '#D97706',
    foliageColor: '#059669',
    hillSlope: 0,
    roadScale: 1.04,
    trafficDensity: 1.25,
    archTheme: 'commercial',
    signsBn: ['মতিঝিল বাণিজ্যিক', 'শাপলা চত্বর', 'দিলকুশা'],
    treeWeights: ['MANGO_TREE', 'PALM_TREE', 'BANYAN_TREE'],
  },
  {
    id: 'dhaka_shahbagh',
    name: 'Shahbagh',
    nameBn: 'শাহবাগ',
    subtitle: 'Flower Market, Cultural Crossroads & Public Library',
    startX: 160,
    endX: 210,
    skyTop: '#BEE2F4',
    skyBottom: '#FBF5E4',
    fogColor: '#E9ECD9',
    skylineColor: '#8CA89C',
    terrainColor: '#CBD4BA',
    roadColor: '#2C313A',
    roadAltColor: '#383E49',
    curbColor: PALETTE.rickshawCrimson,
    foliageColor: '#15803D',
    hillSlope: 0,
    roadScale: 1.02,
    trafficDensity: 1.1,
    archTheme: 'bazaar',
    signsBn: ['শাহবাগ ফুল বাজার', 'জাদুঘর মোড়', 'পাবলিক লাইব্রেরি'],
    treeWeights: ['BANYAN_TREE', 'MANGO_TREE', 'COCONUT_TREE'],
  },
  {
    id: 'dhaka_du',
    name: 'Dhaka University',
    nameBn: 'ঢাকা বিশ্ববিদ্যালয়',
    subtitle: 'Red-Brick Curzon Hall, TSC & Canopy Walkways',
    startX: 210,
    endX: 260,
    skyTop: '#BEE3F4',
    skyBottom: '#FBF5E4',
    fogColor: '#E7EBD6',
    skylineColor: '#86A495',
    terrainColor: '#C2D1B2',
    roadColor: '#2D313A',
    roadAltColor: '#393E4A',
    curbColor: PALETTE.curbBrick,
    foliageColor: '#15803D',
    hillSlope: 0,
    roadScale: 1.02,
    trafficDensity: 0.95,
    archTheme: 'campus',
    signsBn: ['ঢাকা বিশ্ববিদ্যালয়', 'কার্জন হল', 'টিএসসি চত্বর'],
    treeWeights: ['BANYAN_TREE', 'MANGO_TREE', 'BANYAN_TREE'],
  },
  {
    id: 'dhaka_dhanmondi',
    name: 'Dhanmondi',
    nameBn: 'ধানমন্ডি',
    subtitle: 'Lakeside Shade Trees, Book Cafes & Art Houses',
    startX: 260,
    endX: 310,
    skyTop: '#BBE2F5',
    skyBottom: '#F9F3DF',
    fogColor: '#E5ECD9',
    skylineColor: '#86A29B',
    terrainColor: '#C4D0B8',
    roadColor: '#2A2F38',
    roadAltColor: '#363C47',
    curbColor: PALETTE.emeraldGreen,
    foliageColor: '#16A34A',
    hillSlope: 0,
    roadScale: 1.05,
    trafficDensity: 1.05,
    archTheme: 'boulevard',
    signsBn: ['ধানমন্ডি লেক', 'সাতমসজিদ রোড', 'রবীন্দ্র সরোবর'],
    treeWeights: ['MANGO_TREE', 'BANYAN_TREE', 'PALM_TREE'],
  },
  {
    id: 'dhaka_farmgate',
    name: 'Farmgate',
    nameBn: 'ফার্মগেট',
    subtitle: 'Bustling Overpass Junction & Academic Corridor',
    startX: 310,
    endX: 360,
    skyTop: '#BDDDF0',
    skyBottom: '#F8EED8',
    fogColor: '#E7E2D4',
    skylineColor: '#919FAE',
    terrainColor: '#CEC6B8',
    roadColor: '#282C34',
    roadAltColor: '#343A44',
    curbColor: PALETTE.marigoldGold,
    foliageColor: '#059669',
    hillSlope: 0,
    roadScale: 1.03,
    trafficDensity: 1.25,
    archTheme: 'commercial',
    signsBn: ['ফার্মগেট ওভারপাস', 'আনন্দ সিনেমা মোড়', 'খামারবাড়ি'],
    treeWeights: ['MANGO_TREE', 'PALM_TREE', 'COCONUT_TREE'],
  },
  {
    id: 'dhaka_mirpur',
    name: 'Mirpur',
    nameBn: 'মিরপুর',
    subtitle: 'Metro Viaduct Corridor & Neighbourhood Markets',
    startX: 360,
    endX: 405,
    skyTop: '#BDDDF0',
    skyBottom: '#F8F0DC',
    fogColor: '#E6E2D6',
    skylineColor: '#91A0AE',
    terrainColor: '#CEC4B2',
    roadColor: '#292E36',
    roadAltColor: '#353C46',
    curbColor: '#0D9488',
    foliageColor: '#059669',
    hillSlope: 0,
    roadScale: 1.05,
    trafficDensity: 1.2,
    archTheme: 'flyover',
    signsBn: ['মিরপুর-১০', 'মেট্রো করিডোর', 'কাজীপাড়া'],
    treeWeights: ['MANGO_TREE', 'COCONUT_TREE', 'PALM_TREE'],
  },
  {
    id: 'dhaka_uttara',
    name: 'Uttara',
    nameBn: 'উত্তরা',
    subtitle: 'Wide Planned Boulevards & Lakefront Avenue',
    startX: 405,
    endX: 450,
    skyTop: '#BAE0F6',
    skyBottom: '#FCF6E6',
    fogColor: '#E6ECEF',
    skylineColor: '#8CA3B8',
    terrainColor: '#C8D0C2',
    roadColor: '#272C35',
    roadAltColor: '#333A46',
    curbColor: PALETTE.emeraldGreen,
    foliageColor: '#16A34A',
    hillSlope: 0,
    roadScale: 1.1,
    trafficDensity: 1.05,
    archTheme: 'boulevard',
    signsBn: ['উত্তরা সেক্টর-৭', 'জসিমউদ্দীন রোড', 'দিয়াবাড়ি'],
    treeWeights: ['PALM_TREE', 'MANGO_TREE', 'COCONUT_TREE'],
  },
];

export const CHATTOGRAM_DISTRICTS: DistrictSegmentDef[] = [
  {
    id: 'ctg_patenga',
    name: 'Patenga',
    nameBn: 'পতেঙ্গা',
    subtitle: 'Bay of Bengal Sea Embankment & Coastal Breeze',
    startX: 0,
    endX: 50,
    skyTop: '#9CDCF0',
    skyBottom: '#FBF5DF',
    fogColor: '#DCEFF2',
    skylineColor: '#6EA8B8',
    terrainColor: '#D9D0B4',
    roadColor: '#2C353D',
    roadAltColor: '#38434D',
    curbColor: PALETTE.peacockTeal,
    foliageColor: '#059669',
    hillSlope: -0.15,
    roadScale: 1.04,
    trafficDensity: 0.9,
    archTheme: 'coastal',
    signsBn: ['পতেঙ্গা সৈকত', 'সাগরপাড়', 'বন্দর সড়ক'],
    treeWeights: ['COCONUT_TREE', 'PALM_TREE', 'COCONUT_TREE'],
  },
  {
    id: 'ctg_port',
    name: 'Chattogram Port Area',
    nameBn: 'চট্টগ্রাম বন্দর এলাকা',
    subtitle: 'Cargo Terminals, Gantry Cranes & Maritime Trade',
    startX: 50,
    endX: 100,
    skyTop: '#A6D8EC',
    skyBottom: '#F6EED9',
    fogColor: '#DAE8EB',
    skylineColor: '#6B889E',
    terrainColor: '#C7C5BB',
    roadColor: '#262E36',
    roadAltColor: '#333D47',
    curbColor: '#D97706',
    foliageColor: '#047857',
    hillSlope: 0.05,
    roadScale: 1.08,
    trafficDensity: 1.25,
    archTheme: 'port',
    signsBn: ['চট্টগ্রাম বন্দর', 'কাস্টমস মোড়', 'সল্টগোলা'],
    treeWeights: ['COCONUT_TREE', 'PALM_TREE', 'MANGO_TREE'],
  },
  {
    id: 'ctg_agrabad',
    name: 'Agrabad',
    nameBn: 'আগ্রাবাদ',
    subtitle: 'Port-City Commercial Towers & Maritime Offices',
    startX: 100,
    endX: 150,
    skyTop: '#AEDAF0',
    skyBottom: '#F7EED8',
    fogColor: '#DDE7E9',
    skylineColor: '#7691A8',
    terrainColor: '#C9C4B8',
    roadColor: '#283038',
    roadAltColor: '#35404B',
    curbColor: PALETTE.royalIndigo,
    foliageColor: '#047857',
    hillSlope: 0.14,
    roadScale: 1.06,
    trafficDensity: 1.2,
    archTheme: 'commercial',
    signsBn: ['আগ্রাবাদ বাণিজ্যিক', 'বাদামতলী', 'শেখ মুজিব রোড'],
    treeWeights: ['COCONUT_TREE', 'PALM_TREE', 'MANGO_TREE'],
  },
  {
    id: 'ctg_new_market',
    name: 'New Market',
    nameBn: 'নিউ মার্কেট',
    subtitle: 'Historic Twin-Terrace Bazaar & Clock Crossroads',
    startX: 150,
    endX: 200,
    skyTop: '#B4DCF0',
    skyBottom: '#F9EFDA',
    fogColor: '#E3EAE3',
    skylineColor: '#7D959C',
    terrainColor: '#CFC6B3',
    roadColor: '#2B323A',
    roadAltColor: '#38404A',
    curbColor: PALETTE.curbBrick,
    foliageColor: '#059669',
    hillSlope: 0.28,
    roadScale: 0.99,
    trafficDensity: 1.15,
    archTheme: 'bazaar',
    signsBn: ['চট্টগ্রাম নিউ মার্কেট', 'রেয়াজউদ্দিন বাজার', 'আন্দরকিল্লা'],
    treeWeights: ['BANYAN_TREE', 'MANGO_TREE', 'COCONUT_TREE'],
  },
  {
    id: 'ctg_gec',
    name: 'GEC Circle',
    nameBn: 'জিইসি মোড়',
    subtitle: 'Hilly City Centre & Sloping Urban Junction',
    startX: 200,
    endX: 250,
    skyTop: '#B6DCF2',
    skyBottom: '#F7F1DF',
    fogColor: '#DFE9E1',
    skylineColor: '#789A8E',
    terrainColor: '#BAC9AE',
    roadColor: '#2D343C',
    roadAltColor: '#39424C',
    curbColor: PALETTE.peacockTeal,
    foliageColor: '#15803D',
    hillSlope: 0.65,
    roadScale: 1.0,
    trafficDensity: 1.15,
    archTheme: 'hills',
    signsBn: ['জিইসি মোড়', 'নাসিরাবাদ', 'মেহেদীবাগ'],
    treeWeights: ['BANYAN_TREE', 'COCONUT_TREE', 'MANGO_TREE'],
  },
  {
    id: 'ctg_foys_lake',
    name: "Foy's Lake",
    nameBn: 'ফয়েজ লেক',
    subtitle: 'Lush Green Ridges & Lakeside Valley Road',
    startX: 250,
    endX: 300,
    skyTop: '#AEE1EC',
    skyBottom: '#F6F4E2',
    fogColor: '#D8ECE3',
    skylineColor: '#5D8E7F',
    terrainColor: '#A9C49B',
    roadColor: '#2F363D',
    roadAltColor: '#3C454E',
    curbColor: PALETTE.emeraldGreen,
    foliageColor: '#16A34A',
    hillSlope: -0.45,
    roadScale: 0.98,
    trafficDensity: 0.9,
    archTheme: 'hills',
    signsBn: ['ফয়েজ লেক', 'পাহাড়তলী', 'লেক ভ্যালি'],
    treeWeights: ['MANGO_TREE', 'BANYAN_TREE', 'COCONUT_TREE'],
  },
];

export const SYLHET_DISTRICTS: DistrictSegmentDef[] = [
  {
    id: 'syl_surma',
    name: 'Surma Riverfront',
    nameBn: 'সুরমা পাড়',
    subtitle: 'Stone Embankments, Boats & Misty River Breeze',
    startX: 0,
    endX: 50,
    skyTop: '#B2DBE9',
    skyBottom: '#F7F4E4',
    fogColor: '#DDECE7',
    skylineColor: '#6B9690',
    terrainColor: '#C1D2BA',
    roadColor: '#2C333B',
    roadAltColor: '#38414B',
    curbColor: '#0D9488',
    foliageColor: '#15803D',
    hillSlope: 0.1,
    roadScale: 0.98,
    trafficDensity: 0.9,
    archTheme: 'riverfront',
    signsBn: ['সুরমা পাড়', 'চাঁদনীঘাট', 'নৌকা ঘাট'],
    treeWeights: ['BANYAN_TREE', 'MANGO_TREE', 'TEA_SHADE_TREE'],
  },
  {
    id: 'syl_keane_clock',
    name: "Keane Bridge & Ali Amjad's Clock",
    nameBn: 'কীন ব্রিজ ও আলী আমজাদের ঘড়ি',
    subtitle: '1936 Steel Truss Gateway & Heritage 1874 Clock Tower',
    startX: 50,
    endX: 100,
    skyTop: '#B5DCEB',
    skyBottom: '#F7F3E2',
    fogColor: '#DEEBE6',
    skylineColor: '#6F9992',
    terrainColor: '#BFD1B8',
    roadColor: '#2B323A',
    roadAltColor: '#37404A',
    curbColor: PALETTE.curbBrick,
    foliageColor: '#15803D',
    hillSlope: 0.2,
    roadScale: 0.98,
    trafficDensity: 0.95,
    archTheme: 'bazaar',
    signsBn: ['কীন ব্রিজ', 'আলী আমজাদের ঘড়ি', 'স্টেশন রোড'],
    treeWeights: ['BANYAN_TREE', 'MANGO_TREE', 'PALM_TREE'],
  },
  {
    id: 'syl_bandar_bazar',
    name: 'Bandar Bazar',
    nameBn: 'বন্দর বাজার',
    subtitle: 'Historic Commercial Lanes & Stone-Plinth Tea Traders',
    startX: 100,
    endX: 150,
    skyTop: '#BCE0EE',
    skyBottom: '#F6F1DF',
    fogColor: '#E1EBE4',
    skylineColor: '#75998D',
    terrainColor: '#C6D0BE',
    roadColor: '#2A3038',
    roadAltColor: '#363E48',
    curbColor: PALETTE.royalIndigo,
    foliageColor: '#047857',
    hillSlope: 0.22,
    roadScale: 0.99,
    trafficDensity: 1.15,
    archTheme: 'bazaar',
    signsBn: ['বন্দর বাজার', 'কোর্ট পয়েন্ট', 'সুরমা মার্কেট'],
    treeWeights: ['MANGO_TREE', 'TEA_SHADE_TREE', 'BANYAN_TREE'],
  },
  {
    id: 'syl_zindabazar',
    name: 'Zindabazar',
    nameBn: 'জিন্দাবাজার',
    subtitle: 'Downtown Shopping Avenue & Manipuri Craft Arcade',
    startX: 150,
    endX: 200,
    skyTop: '#BFE0EE',
    skyBottom: '#F6F2E0',
    fogColor: '#E2EBE4',
    skylineColor: '#769A8D',
    terrainColor: '#C4CEBC',
    roadColor: '#2B3139',
    roadAltColor: '#383F49',
    curbColor: PALETTE.peacockTeal,
    foliageColor: '#15803D',
    hillSlope: 0.28,
    roadScale: 1.02,
    trafficDensity: 1.15,
    archTheme: 'commercial',
    signsBn: ['জিন্দাবাজার', 'চৌহাট্টা', 'জল্লারপাড়'],
    treeWeights: ['MANGO_TREE', 'TEA_SHADE_TREE', 'PALM_TREE'],
  },
  {
    id: 'syl_amberkhana',
    name: 'Amberkhana',
    nameBn: 'আম্বরখানা',
    subtitle: 'Northern Transit Point Toward Khasi Foothills',
    startX: 200,
    endX: 250,
    skyTop: '#C2E3ED',
    skyBottom: '#F5F4E4',
    fogColor: '#DBEBE0',
    skylineColor: '#699482',
    terrainColor: '#B3C9A5',
    roadColor: '#2C333A',
    roadAltColor: '#384049',
    curbColor: PALETTE.emeraldGreen,
    foliageColor: '#16A34A',
    hillSlope: 0.45,
    roadScale: 1.04,
    trafficDensity: 1.0,
    archTheme: 'hills',
    signsBn: ['আম্বরখানা পয়েন্ট', 'জাফলং রোড', 'এয়ারপোর্ট রোড'],
    treeWeights: ['TEA_SHADE_TREE', 'BANYAN_TREE', 'MANGO_TREE'],
  },
  {
    id: 'syl_sust',
    name: 'SUST & Tea Surroundings',
    nameBn: 'শাবিপ্রবি ও চা বাগান',
    subtitle: 'Akhalia Campus Avenue & Terraced Green Tea Hills',
    startX: 250,
    endX: 300,
    skyTop: '#B8E2E6',
    skyBottom: '#F6F6E6',
    fogColor: '#D6ECDF',
    skylineColor: '#568B72',
    terrainColor: '#98BE89',
    roadColor: '#2E363B',
    roadAltColor: '#3B454B',
    curbColor: '#15803D',
    foliageColor: '#16A34A',
    hillSlope: -0.25,
    roadScale: 1.06,
    trafficDensity: 0.85,
    archTheme: 'tea_valley',
    signsBn: ['শাবিপ্রবি গেট', 'মালনীছড়া চা বাগান', 'আখালিয়া'],
    treeWeights: ['TEA_SHADE_TREE', 'TEA_SHADE_TREE', 'BANYAN_TREE'],
  },
];

export const MAP_DISTRICTS: Record<MapId, DistrictSegmentDef[]> = {
  dhaka: DHAKA_DISTRICTS,
  chattogram: CHATTOGRAM_DISTRICTS,
  sylhet: SYLHET_DISTRICTS,
};

const TRANSITION_HALF_TILES = 10;

export function sampleEnvironmentAt(mapId: MapId, groundX: number): SampledEnvironment {
  const list = MAP_DISTRICTS[mapId];
  const cycleLength = list[list.length - 1].endX;
  const wrappedX = ((groundX % cycleLength) + cycleLength) % cycleLength;

  let idx = list.findIndex((d) => wrappedX >= d.startX && wrappedX < d.endX);
  if (idx === -1) idx = list.length - 1;

  const curr = list[idx];
  const nextIdx = (idx + 1) % list.length;
  const prevIdx = (idx - 1 + list.length) % list.length;

  let other: DistrictSegmentDef | null = null;
  let blend = 0;

  if (curr.endX - wrappedX < TRANSITION_HALF_TILES) {
    other = list[nextIdx];
    blend = smoothstep(curr.endX - TRANSITION_HALF_TILES, curr.endX + TRANSITION_HALF_TILES, wrappedX);
  } else if (wrappedX - curr.startX < TRANSITION_HALF_TILES) {
    other = list[prevIdx];
    blend = 1 - smoothstep(curr.startX - TRANSITION_HALF_TILES, curr.startX + TRANSITION_HALF_TILES, wrappedX);
  }

  if (!other || blend <= 0.001) {
    return {
      district: curr,
      skyTop: curr.skyTop,
      skyBottom: curr.skyBottom,
      fogColor: curr.fogColor,
      skylineColor: curr.skylineColor,
      terrainColor: curr.terrainColor,
      roadColor: curr.roadColor,
      roadAltColor: curr.roadAltColor,
      curbColor: curr.curbColor,
      foliageColor: curr.foliageColor,
      hillSlope: curr.hillSlope,
      roadScale: curr.roadScale,
    };
  }

  return {
    district: curr,
    skyTop: mixHexColor(curr.skyTop, other.skyTop, blend),
    skyBottom: mixHexColor(curr.skyBottom, other.skyBottom, blend),
    fogColor: mixHexColor(curr.fogColor, other.fogColor, blend),
    skylineColor: mixHexColor(curr.skylineColor, other.skylineColor, blend),
    terrainColor: mixHexColor(curr.terrainColor, other.terrainColor, blend),
    roadColor: mixHexColor(curr.roadColor, other.roadColor, blend),
    roadAltColor: mixHexColor(curr.roadAltColor, other.roadAltColor, blend),
    curbColor: mixHexColor(curr.curbColor, other.curbColor, blend),
    foliageColor: mixHexColor(curr.foliageColor, other.foliageColor, blend),
    hillSlope: curr.hillSlope + (other.hillSlope - curr.hillSlope) * blend,
    roadScale: curr.roadScale + (other.roadScale - curr.roadScale) * blend,
  };
}

export type WireInfrastructureProfile =
  | 'dense_old_dhaka'
  | 'commercial_dhaka'
  | 'residential_dhaka'
  | 'planned_uttara'
  | 'coastal_port_ctg'
  | 'tidy_sylhet';

export interface DistrictInfrastructureProfile {
  wireProfile: WireInfrastructureProfile;
  strandCount: number;
  poleModulo: number;
  hasCrossStreetSpans: boolean;
  hasCoiledTelecomBundles: boolean;
  hasTransformers: boolean;
  hasFasciaServiceDrops: boolean;
  /** Curated lateral offset multiplier (relative to roadScale) so trees sit in curb pits or park verges, never mid-footpath */
  treeLateralFactor: number;
  useTreePit: boolean;
  allowRoadsideTrees: boolean;
}

export function getDistrictInfrastructureProfile(
  mapId: MapId,
  district: DistrictSegmentDef
): DistrictInfrastructureProfile {
  if (mapId === 'dhaka') {
    if (district.id === 'dhaka_old_dhaka') {
      return {
        wireProfile: 'dense_old_dhaka',
        strandCount: 5,
        poleModulo: 2,
        hasCrossStreetSpans: true,
        hasCoiledTelecomBundles: true,
        hasTransformers: true,
        hasFasciaServiceDrops: true,
        treeLateralFactor: 1.72,
        useTreePit: true,
        allowRoadsideTrees: false, // Narrow historic bazaar alleys keep trees in occasional open pockets only
      };
    }
    if (district.id === 'dhaka_motijheel' || district.id === 'dhaka_farmgate') {
      return {
        wireProfile: 'commercial_dhaka',
        strandCount: 4,
        poleModulo: 3,
        hasCrossStreetSpans: district.id === 'dhaka_farmgate',
        hasCoiledTelecomBundles: true,
        hasTransformers: true,
        hasFasciaServiceDrops: true,
        treeLateralFactor: 1.73,
        useTreePit: true,
        allowRoadsideTrees: true,
      };
    }
    if (district.id === 'dhaka_mirpur' || district.id === 'dhaka_sadarghat') {
      return {
        wireProfile: 'residential_dhaka',
        strandCount: 4,
        poleModulo: 2,
        hasCrossStreetSpans: true,
        hasCoiledTelecomBundles: true,
        hasTransformers: true,
        hasFasciaServiceDrops: true,
        treeLateralFactor: 1.73,
        useTreePit: true,
        allowRoadsideTrees: true,
      };
    }
    if (district.id === 'dhaka_uttara') {
      return {
        wireProfile: 'planned_uttara',
        strandCount: 2,
        poleModulo: 4,
        hasCrossStreetSpans: false,
        hasCoiledTelecomBundles: false,
        hasTransformers: false,
        hasFasciaServiceDrops: false,
        treeLateralFactor: 1.74,
        useTreePit: true,
        allowRoadsideTrees: true,
      };
    }
    // Shahbagh, Dhaka University, Dhanmondi: greenery + urban poles
    return {
      wireProfile: 'residential_dhaka',
      strandCount: 3,
      poleModulo: 3,
      hasCrossStreetSpans: false,
      hasCoiledTelecomBundles: district.id === 'dhaka_shahbagh',
      hasTransformers: false,
      hasFasciaServiceDrops: true,
      treeLateralFactor: 1.74,
      useTreePit: true,
      allowRoadsideTrees: true,
    };
  }

  if (mapId === 'chattogram') {
    return {
      wireProfile: 'coastal_port_ctg',
      strandCount: district.archTheme === 'commercial' || district.archTheme === 'bazaar' ? 3 : 2,
      poleModulo: district.archTheme === 'hills' ? 4 : 3,
      hasCrossStreetSpans: false,
      hasCoiledTelecomBundles: district.archTheme === 'bazaar',
      hasTransformers: district.archTheme === 'port' || district.archTheme === 'commercial',
      hasFasciaServiceDrops: false,
      treeLateralFactor: district.archTheme === 'hills' ? 1.76 : 1.72,
      useTreePit: district.archTheme !== 'hills',
      allowRoadsideTrees: true,
    };
  }

  // Sylhet: tidy riverfront & tea-valley infrastructure
  return {
    wireProfile: 'tidy_sylhet',
    strandCount: district.archTheme === 'tea_valley' ? 1 : 2,
    poleModulo: district.archTheme === 'tea_valley' ? 4 : 3,
    hasCrossStreetSpans: false,
    hasCoiledTelecomBundles: false,
    hasTransformers: false,
    hasFasciaServiceDrops: false,
    treeLateralFactor: district.archTheme === 'tea_valley' ? 1.76 : 1.73,
    useTreePit: district.archTheme !== 'tea_valley',
    allowRoadsideTrees: true,
  };
}
