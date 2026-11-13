import assert from 'node:assert/strict';
import test from 'node:test';
import { ASSET_PATHS, getPlayerCharacterImage } from './assets';
import {
  BostaEngine,
  DHAKA_LANDMARK_GATES,
  getPermanentShopForSlot,
  getTotalHistoricalCatalogCount,
  HIGH_HOP_VZ,
  HISTORICAL_COIN_GOLD_AWARD,
  LandmarkGate,
  POWERUP_DURATION_SEC,
} from './engine';
import { groundDepth, toScreen } from './iso';
import { MAPS } from './maps';
import { MemoryProgressAdapter, PLATINUM_DISTANCE_THRESHOLD_M } from './persistence';
import { computeDepthVisibility, PLAYER_CAM_OFFSET_X } from './perspective';
import { getAllConfiguredShopNames } from './shops';
import {
  fitSignboardFontSize,
  getBakedSignboardTexture,
  getBakedTeaStallTexture,
  SIGN_INNER_MAX_WIDTH,
  SIGN_MAX_FONT_PX,
  SIGN_MIN_FONT_PX,
} from './signboardCache';
import {
  CHATTOGRAM_DISTRICTS,
  DHAKA_DISTRICTS,
  getDistrictInfrastructureProfile,
  sampleEnvironmentAt,
  SYLHET_DISTRICTS,
} from './worldSegments';

test('toScreen matches oblique 2:1 projection formula', () => {
  const p = toScreen(2, 1, 10);
  assert.equal(p.x, 64);
  assert.equal(p.y, 86);
  assert.ok(groundDepth(3, 0) > groundDepth(2, 0));
});

test('auto-hop keeps running without input and survives opening tiles', () => {
  const engine = new BostaEngine();
  engine.startNewRun('dhaka');
  assert.equal(engine.phase, 'playing');

  let maxZ = 0;
  for (let i = 0; i < 60; i++) {
    engine.step(1 / 60);
    maxZ = Math.max(maxZ, engine.z);
  }
  assert.ok(maxZ > 30, 'Player must auto-hop into the air');
  assert.ok(engine.playerX > 4, 'Player advances along groundX');
  assert.equal(engine.playerState, 'HOP', 'Survives opening second with zero input');
});

test('high hop clears open manhole while ground collision triggers DEAD', () => {
  const engine = new BostaEngine();
  engine.startNewRun('dhaka');
  engine.obstacles = [
    {
      id: 99,
      kind: 'MANHOLE',
      groundX: 5,
      lane: 0,
      footprintX: 0.62,
      height: 44,
      caption: 'Open manholes: a real danger on our roads.',
      hit: false,
      vx: 0,
    },
  ];
  engine.playerX = 5;
  engine.lane = 0;
  engine.lanePos = 0;
  engine.z = 70;
  engine.vz = HIGH_HOP_VZ * 0.2;
  engine.step(0.016);
  assert.equal(engine.playerState, 'HOP', 'High hop above obstacle.height clears manhole');

  engine.lastCheckpointX = 2;
  engine.coins = 20;
  engine.z = 5;
  engine.vz = 10;
  engine.step(0.016);
  assert.equal(engine.playerState, 'DEAD');
  assert.ok(engine.caption?.text.includes('Open manholes'));

  for (let i = 0; i < 40; i++) {
    engine.step(0.02);
  }
  assert.equal(engine.phase, 'revive');
  assert.equal(engine.canRevive(), true);
  assert.equal(engine.performRevive(), true);
  assert.equal(engine.phase, 'playing');
  assert.equal(engine.coins, 10);
  assert.equal(engine.revivesUsed, 1);
});

test('pothole triggers stumble and speed recovers over time', () => {
  const engine = new BostaEngine();
  engine.startNewRun('dhaka');
  engine.coins = 12;
  engine.obstacles = [
    {
      id: 101,
      kind: 'POTHOLE',
      groundX: 4,
      lane: 0,
      footprintX: 0.56,
      height: 18,
      caption: 'Pothole!',
      hit: false,
      vx: 0,
    },
  ];
  engine.playerX = 4;
  engine.z = 2;
  engine.step(0.016);
  assert.equal(engine.playerState, 'STUMBLE');
  assert.equal(engine.speedMult, 0.6);
  assert.equal(engine.coins, 7);

  for (let i = 0; i < 100; i++) {
    engine.step(0.03);
  }
  assert.equal(engine.playerState, 'HOP');
  assert.equal(engine.speedMult, 1);
});

test('landmarks award gold and all three maps cover every required neighborhood endlessly without inter-city transitions', () => {
  assert.deepEqual(Object.keys(MAPS).sort(), ['chattogram', 'dhaka', 'sylhet']);

  // Dhaka 9 districts
  assert.equal(sampleEnvironmentAt('dhaka', 10).district.name, 'Sadarghat');
  assert.equal(sampleEnvironmentAt('dhaka', 75).district.name, 'Old Dhaka');
  assert.equal(sampleEnvironmentAt('dhaka', 125).district.name, 'Motijheel');
  assert.equal(sampleEnvironmentAt('dhaka', 175).district.name, 'Shahbagh');
  assert.equal(sampleEnvironmentAt('dhaka', 225).district.name, 'Dhaka University');
  assert.equal(sampleEnvironmentAt('dhaka', 275).district.name, 'Dhanmondi');
  assert.equal(sampleEnvironmentAt('dhaka', 325).district.name, 'Farmgate');
  assert.equal(sampleEnvironmentAt('dhaka', 375).district.name, 'Mirpur');
  assert.equal(sampleEnvironmentAt('dhaka', 425).district.name, 'Uttara');
  // Endless loop stays inside Dhaka
  assert.equal(sampleEnvironmentAt('dhaka', 460).district.name, 'Sadarghat');

  // Chattagram 6 districts
  assert.equal(sampleEnvironmentAt('chattogram', 10).district.name, 'Patenga');
  assert.equal(sampleEnvironmentAt('chattogram', 65).district.name, 'Chattogram Port Area');
  assert.equal(sampleEnvironmentAt('chattogram', 115).district.name, 'Agrabad');
  assert.equal(sampleEnvironmentAt('chattogram', 165).district.name, 'New Market');
  assert.equal(sampleEnvironmentAt('chattogram', 215).district.name, 'GEC Circle');
  assert.equal(sampleEnvironmentAt('chattogram', 265).district.name, "Foy's Lake");
  assert.equal(sampleEnvironmentAt('chattogram', 310).district.name, 'Patenga');

  // Sylhet 6 districts covering all 7 locations
  assert.equal(sampleEnvironmentAt('sylhet', 10).district.name, 'Surma Riverfront');
  assert.equal(sampleEnvironmentAt('sylhet', 65).district.name, "Keane Bridge & Ali Amjad's Clock");
  assert.equal(sampleEnvironmentAt('sylhet', 115).district.name, 'Bandar Bazar');
  assert.equal(sampleEnvironmentAt('sylhet', 165).district.name, 'Zindabazar');
  assert.equal(sampleEnvironmentAt('sylhet', 215).district.name, 'Amberkhana');
  assert.equal(sampleEnvironmentAt('sylhet', 265).district.name, 'SUST & Tea Surroundings');
  assert.equal(sampleEnvironmentAt('sylhet', 310).district.name, 'Surma Riverfront');

  // Map stays locked during an active endless run past cycleLengthTiles
  const engine = new BostaEngine();
  engine.startNewRun('chattogram');
  assert.equal(engine.isMapLocked(), true);
  assert.equal(engine.lockedMapId, 'chattogram');
  assert.equal(engine.selectTitleMap('sylhet'), false);
  engine.setupMap('dhaka', false);
  assert.equal(engine.currentMap.id, 'chattogram', 'Cannot switch cities mid-run');

  engine.invulnTimer = 20;
  engine.playerX = 305; // Past Chattagram 300-tile cycle
  engine.step(0.016);
  assert.equal(engine.phase, 'playing');
  assert.equal(engine.currentMap.id, 'chattogram', 'Endless run stays inside Chattagram');
  assert.equal(engine.currentDistrict.name, 'Patenga');

  engine.returnToTitle();
  assert.equal(engine.isMapLocked(), false);
  assert.equal(engine.selectTitleMap('sylhet'), true);
  assert.equal(engine.currentMap.id, 'sylhet');
});

test('extended endless runs keep entities bounded and culls behind-camera entities cleanly', () => {
  for (const mapId of ['dhaka', 'chattogram', 'sylhet'] as const) {
    const engine = new BostaEngine();
    engine.startNewRun(mapId);
    engine.invulnTimer = 20;
    for (let i = 0; i < 120; i++) {
      engine.step(0.05);
    }
    assert.equal(engine.phase, 'playing');
    assert.equal(engine.currentMap.id, mapId);
    assert.ok(engine.props.length < 220, 'Props stay bounded via culling');
    assert.ok(engine.obstacles.length < 40, 'Obstacles stay bounded via culling');
  }
});

test('distance fog keeps vehicles and hazards crisp in reaction zone while fading distant scenery', () => {
  const nearBus = computeDepthVisibility(6, 'vehicle');
  const nearHole = computeDepthVisibility(5, 'hazard');
  const farBuilding = computeDepthVisibility(29, 'scenery');
  assert.equal(nearBus.alpha, 1);
  assert.equal(nearHole.alpha, 1);
  assert.ok(farBuilding.fogMix > 0.65, 'Distant scenery blends smoothly into horizon fog');
  assert.ok(farBuilding.alpha < 0.65, 'Distant scenery fades smoothly before horizon exit');
});

test('Dhaka LandmarkGate classes trigger toast and gold award once upon passing Ahsan Manjil and Lalbagh Fort', () => {
  const ahsanDef = DHAKA_LANDMARK_GATES.find((g) => g.id === 'ahsan_manjil');
  const lalbaghDef = DHAKA_LANDMARK_GATES.find((g) => g.id === 'lalbagh_fort');
  const curzonDef = DHAKA_LANDMARK_GATES.find((g) => g.id === 'curzon_hall');
  assert.ok(ahsanDef, 'Ahsan Manjil gate data must exist in Dhaka map data');
  assert.ok(lalbaghDef, 'Lalbagh Fort gate data must exist in Dhaka map data');
  assert.ok(curzonDef, 'Curzon Hall gate data must exist in Dhaka map data');
  assert.equal(ahsanDef.checkpointId, 'cp_dhaka_ahsan_manjil');
  assert.equal(lalbaghDef.checkpointId, 'cp_dhaka_lalbagh_fort');
  assert.equal(ahsanDef.groundCoordinates.groundX, 52);
  assert.equal(lalbaghDef.groundCoordinates.groundX, 92);
  assert.equal(curzonDef.groundCoordinates.groundX, 235);
  assert.equal(ahsanDef.goldAwardStatus, 'pending');
  assert.equal(lalbaghDef.goldAwardStatus, 'pending');

  assert.throws(() => new LandmarkGate({ ...ahsanDef, history: '   ' }), /history one-liner/);

  const ahsanGate = new LandmarkGate(ahsanDef);
  assert.equal(ahsanGate.goldAwardStatus, 'pending');
  assert.equal(ahsanGate.tryPass(ahsanDef.groundX - 1), null, 'Does not trigger before gate coordinate');
  const firstPass = ahsanGate.tryPass(ahsanDef.groundX);
  assert.ok(firstPass, 'Triggers upon reaching Ahsan Manjil coordinate');
  assert.equal(firstPass.goldAwarded, 1);
  assert.equal(firstPass.goldAwardStatus, 'awarded');
  assert.equal(ahsanGate.goldAwardStatus, 'awarded');
  assert.equal(firstPass.checkpointId, 'cp_dhaka_ahsan_manjil');
  assert.ok(firstPass.toast.name.includes('Ahsan Manjil'));
  assert.equal(ahsanGate.tryPass(ahsanDef.groundX + 5), null, 'Idempotent after first pass');

  let landmarkEvents = 0;
  const engine = new BostaEngine({
    onLandmark: () => {
      landmarkEvents += 1;
    },
  });
  engine.startNewRun('dhaka');
  engine.invulnTimer = 5;

  // Pass Ahsan Manjil (Sadarghat)
  engine.playerX = ahsanDef.groundX + 0.1;
  engine.step(0.016);
  assert.equal(engine.gold, 1);
  assert.equal(engine.lastCheckpointId, 'cp_dhaka_ahsan_manjil');
  assert.equal(engine.lastCheckpointName, 'Ahsan Manjil');
  assert.ok(engine.triggeredCheckpointIds.includes('cp_dhaka_ahsan_manjil'));
  assert.ok(engine.landmarkToast?.name.includes('Ahsan Manjil'));
  assert.equal(engine.landmarkToast?.badge, '+1 Gold · Checkpoint Saved');

  // Pass Lalbagh Fort (Old Dhaka)
  engine.playerX = lalbaghDef.groundX + 0.1;
  engine.step(0.016);
  assert.equal(engine.gold, 2);
  assert.equal(engine.lastCheckpointId, 'cp_dhaka_lalbagh_fort');
  assert.equal(engine.lastCheckpointName, 'Lalbagh Fort');

  // Pass Curzon Hall (Dhaka University)
  engine.playerX = curzonDef.groundX + 0.1;
  engine.step(0.016);
  assert.equal(engine.gold, 3);
  assert.equal(landmarkEvents, 3);
});

test('character asset path points to uploaded Bosta Kid sprite and falls back safely in headless Node', () => {
  assert.equal(ASSET_PATHS.playerCharacter, '/assets/aistudio/image_7259759b.png');
  assert.equal(getPlayerCharacterImage(), null);
});

test('buildings never fade or receive distance fog and stay continuously populated until exiting behind camera', () => {
  for (const relX of [0.35, 1.0, 12.0, 25.0, 38.0]) {
    const vis = computeDepthVisibility(relX, 'building');
    assert.equal(vis.alpha, 1, `Building at relX=${relX} must stay 100% opaque`);
    assert.equal(vis.fogMix, 0, `Building at relX=${relX} must have zero fog`);
  }

  const engine = new BostaEngine();
  engine.startNewRun('dhaka');
  engine.invulnTimer = 20;

  for (let tick = 0; tick < 240; tick++) {
    engine.step(0.05);
    const cameraX = engine.playerX - PLAYER_CAM_OFFSET_X;
    const buildings = engine.props.filter(
      (p) => p.kind === 'BUILDING' || p.kind === 'UNIVERSITY_HALL'
    );

    for (const side of [-1, 1] as const) {
      const sideBuildings = buildings
        .filter((b) => b.side === side)
        .sort((a, b) => a.groundX - b.groundX);
      assert.ok(sideBuildings.length >= 16, `Side ${side} must have continuous buildings`);
      assert.ok(
        sideBuildings[0].groundX <= cameraX + 0.35,
        'Oldest building starts at or behind camera near plane so no building pops off while visible'
      );
      assert.ok(
        sideBuildings[sideBuildings.length - 1].groundX >= engine.playerX + 38,
        'Buildings spawn continuously far ahead of player'
      );
      for (let i = 1; i < sideBuildings.length; i++) {
        assert.equal(
          sideBuildings[i].groundX - sideBuildings[i - 1].groundX,
          2.5,
          'Adjacent buildings must maintain continuous 2.5-tile spacing with zero empty gaps'
        );
      }
    }
  }
});

test('creative shop catalogue spans Dhaka, Chattagram, and Sylhet by location and businessType with permanent identities and distinct architecture', () => {
  const allShops = getAllConfiguredShopNames();
  const names = new Set(allShops.map((s) => s.nameBn));

  const creativeMustInclude = [
    'চায়ের চৌকাঠ',
    'শেষ বিকেলের চা',
    'আড্ডাবাজ চা ঘর',
    'কড়াই কাহিনি',
    'ধোঁয়া ওঠা টি কর্নার',
    'ক্ষুধার রাজ্য',
    'চায়ের বিরতি',
    'ভোজনবিলাস',
    'অক্ষরবাড়ি',
    'পাতার ঘ্রাণ',
    'বইপোকা',
    'কাগজের নৌকা',
    'পাড়ার পসরা',
    'নিত্যদিন',
    'আপন বাজার',
    'রঙিন সম্ভার',
    'ঝটপট বাজার',
    'মায়ের দোয়া হোটেল',
    'ভাই ভাই স্টোর',
    'বিসমিল্লাহ টি স্টল',
    'নিউ ঢাকা ফার্মেসি',
    'জনতা হোটেল',
    'বন্ধন সুইটমিট',
    'সাদিয়া ফ্যাশন',
    'মদিনা ট্রেডার্স',
    'রহমান অটো সার্ভিস',
  ];

  for (const name of creativeMustInclude) {
    assert.ok(names.has(name), `Shop catalogue must include "${name}"`);
  }

  for (const s of allShops) {
    assert.ok(s.shopId.length > 0);
    assert.ok(s.businessType.length > 0);
    assert.ok(!s.nameBn.includes('জেনারেল শপ') && !s.nameBn.includes('নিউ স্টোর'));
  }

  // Distinct city roof styles
  const sylhetSurma = getPermanentShopForSlot('sylhet', 1, -1);
  const ctgPatenga = getPermanentShopForSlot('chattogram', 1, -1);
  assert.equal(sylhetSurma.appearance.roofStyle, 'pitched_gable');
  assert.equal(ctgPatenga.appearance.roofStyle, 'coastal_sloped');

  // Verify permanent identity at fixed coordinates across restarts & lane switches
  const engineA = new BostaEngine();
  engineA.startNewRun('dhaka');
  const shopAtSlot2LeftA = engineA.props.find(
    (p) => (p.kind === 'BUILDING' || p.kind === 'UNIVERSITY_HALL') && p.side === -1 && p.groundX === 5
  )?.shop;
  assert.ok(shopAtSlot2LeftA);
  assert.equal(getBakedSignboardTexture(shopAtSlot2LeftA), null); // safe Node fallback
  assert.equal(getBakedTeaStallTexture(), null);

  // Verify signboard font fitting maximizes legibility without overflowing inner plate width
  const shortPx = fitSignboardFontSize('বইপোকা', (px) => 'বইপোকা'.length * px * 0.55);
  const longName = 'জিন্দাবাজার পালকি মিষ্টান্ন';
  const longPx = fitSignboardFontSize(longName, (px) => longName.length * px * 0.55);
  assert.equal(shortPx, SIGN_MAX_FONT_PX);
  assert.ok(longPx >= SIGN_MIN_FONT_PX && longPx < SIGN_MAX_FONT_PX);
  assert.ok(longName.length * longPx * 0.55 <= SIGN_INNER_MAX_WIDTH);

  engineA.requestLaneSwitch(1);
  engineA.step(0.05);
  engineA.requestLaneSwitch(-1);

  const engineB = new BostaEngine();
  engineB.startNewRun('dhaka');
  const shopAtSlot2LeftB = engineB.props.find(
    (p) => (p.kind === 'BUILDING' || p.kind === 'UNIVERSITY_HALL') && p.side === -1 && p.groundX === 5
  )?.shop;

  assert.deepEqual(shopAtSlot2LeftA, shopAtSlot2LeftB);
  assert.deepEqual(shopAtSlot2LeftA, getPermanentShopForSlot('dhaka', 2, -1));
});

test('trees sit in curb-side planting pits at building seams clear of pedestrian footpaths and poles, while Dhaka wiring reflects neighborhood density', () => {
  const engine = new BostaEngine({}, new MemoryProgressAdapter());
  engine.startNewRun('dhaka');

  const treeKinds = new Set([
    'COCONUT_TREE',
    'PALM_TREE',
    'BANYAN_TREE',
    'MANGO_TREE',
    'TEA_SHADE_TREE',
  ]);
  const trees = engine.props.filter((p) => treeKinds.has(p.kind));
  const poles = engine.props.filter((p) => p.kind === 'POLE');

  assert.ok(trees.length > 0, 'Dhaka corridor must spawn roadside trees');
  for (const t of trees) {
    assert.ok(
      t.lateralOffset !== undefined && t.lateralOffset >= 1.72 && t.lateralOffset <= 1.76,
      `Tree ${t.kind} lateralOffset=${t.lateralOffset} must stay in curb pit (1.72-1.76), clear of mid-footpath`
    );
    assert.equal(t.hasTreePit, true, 'Urban Dhaka trees sit inside brick curb tree pits');
    const poleConflict = poles.some(
      (p) => p.side === t.side && Math.abs(p.groundX - t.groundX) < 0.35
    );
    assert.equal(poleConflict, false, 'Trees must never overlap utility poles');
  }

  // Dhaka neighborhood wiring contrasts
  const oldDhaka = DHAKA_DISTRICTS.find((d) => d.id === 'dhaka_old_dhaka')!;
  const motijheel = DHAKA_DISTRICTS.find((d) => d.id === 'dhaka_motijheel')!;
  const uttara = DHAKA_DISTRICTS.find((d) => d.id === 'dhaka_uttara')!;
  const sylhetTea = SYLHET_DISTRICTS.find((d) => d.id === 'syl_sust')!;
  const ctgPort = CHATTOGRAM_DISTRICTS.find((d) => d.id === 'ctg_port')!;

  const oldInfra = getDistrictInfrastructureProfile('dhaka', oldDhaka);
  const motInfra = getDistrictInfrastructureProfile('dhaka', motijheel);
  const uttInfra = getDistrictInfrastructureProfile('dhaka', uttara);
  const sylInfra = getDistrictInfrastructureProfile('sylhet', sylhetTea);
  const ctgInfra = getDistrictInfrastructureProfile('chattogram', ctgPort);

  assert.equal(oldInfra.strandCount, 5);
  assert.equal(oldInfra.hasCrossStreetSpans, true);
  assert.equal(oldInfra.hasCoiledTelecomBundles, true);
  assert.equal(oldInfra.hasTransformers, true);
  assert.equal(oldInfra.allowRoadsideTrees, false);

  assert.equal(motInfra.strandCount, 4);
  assert.equal(uttInfra.strandCount, 2);
  assert.equal(uttInfra.hasCrossStreetSpans, false);
  assert.equal(uttInfra.hasCoiledTelecomBundles, false);

  assert.equal(sylInfra.strandCount, 1);
  assert.equal(sylInfra.hasCrossStreetSpans, false);
  assert.equal(sylInfra.hasTransformers, false);
  assert.equal(ctgInfra.hasTransformers, true);
});

test('four coin types work accurately: 2X doubles General only, Magnet pulls General smoothly without pulling Historical, and Historical awards Gold once', () => {
  const storage = new MemoryProgressAdapter();
  let doubleEvents = 0;
  let magnetEvents = 0;
  let historicalEvents = 0;
  const engine = new BostaEngine(
    {
      onDouble2X: () => {
        doubleEvents += 1;
      },
      onMagnet: () => {
        magnetEvents += 1;
      },
      onHistoricalCoin: () => {
        historicalEvents += 1;
      },
    },
    storage
  );
  engine.startNewRun('dhaka');
  engine.invulnTimer = 20;
  assert.equal(getTotalHistoricalCatalogCount(), 11);

  // Inject deterministic coin test set ahead of player
  engine.coinItems = [
    { id: 1001, kind: 'DOUBLE_2X', groundX: 3.0, lane: 0, z: 18, collected: false },
    { id: 1002, kind: 'GENERAL', groundX: 4.5, lane: 0, z: 16, collected: false },
    { id: 1003, kind: 'MAGNET', groundX: 6.0, lane: 0, z: 18, collected: false },
    { id: 1004, kind: 'GENERAL', groundX: 11.0, lane: 1, z: 14, collected: false },
    {
      id: 1005,
      kind: 'HISTORICAL',
      groundX: 12.0,
      lane: -1,
      z: 20,
      collected: false,
      landmarkId: 'ahsan_manjil',
      landmarkName: 'Ahsan Manjil',
      landmarkNameBn: 'আহসান মঞ্জিল',
      goldValue: HISTORICAL_COIN_GOLD_AWARD,
    },
  ];

  // Collect 2X Coin
  engine.playerX = 3.0;
  engine.z = 18;
  engine.step(0.016);
  assert.equal(doubleEvents, 1);
  assert.ok(engine.doubleCoinsTimer > POWERUP_DURATION_SEC - 0.1);

  // Collect General Coin under active 2X -> +2
  engine.playerX = 4.5;
  engine.z = 16;
  engine.step(0.016);
  assert.equal(engine.coins, 2, '2X multiplier doubles General coin value to +2');

  // Collect Magnet Coin
  engine.playerX = 6.0;
  engine.z = 18;
  engine.step(0.016);
  assert.equal(magnetEvents, 1);
  assert.ok(engine.magnetTimer > POWERUP_DURATION_SEC - 0.1);

  // Step briefly: General coin #1004 in lane 1 is smoothly attracted (not teleported),
  // while Historical coin #1005 in lane -1 remains untouched by Magnet
  const generalCoin = engine.coinItems.find((c) => c.id === 1004)!;
  const histCoin = engine.coinItems.find((c) => c.id === 1005)!;
  const initialDistX = Math.abs(generalCoin.groundX - engine.playerX);
  engine.step(0.05);
  assert.equal(generalCoin.attracted, true);
  assert.equal(generalCoin.collected, false, 'Magnet pulls smoothly over multiple frames instead of instant teleport');
  assert.ok(Math.abs(generalCoin.groundX - engine.playerX) < initialDistX, 'Magnet reduces distance gradually');
  assert.equal(histCoin.attracted, undefined, 'Magnet must never attract Historical coins');
  assert.equal(histCoin.groundX, 12.0);
  assert.equal(histCoin.lanePos, undefined);

  // Collect Historical Coin directly -> awards +2 Gold ONLY (NOT doubled by 2X) & persists discovery
  engine.playerX = 12.0;
  engine.lane = -1;
  engine.lanePos = -1;
  engine.z = 20;
  engine.step(0.016);
  assert.equal(historicalEvents, 1);
  assert.equal(engine.gold, HISTORICAL_COIN_GOLD_AWARD, 'Historical coin awards base Gold unaffected by 2X');
  assert.deepEqual(engine.discoveredHistoricalIds, ['ahsan_manjil']);
  assert.deepEqual(storage.load().discoveredHistoricalIds, ['ahsan_manjil']);
});

test('Platinum Badge unlocks strictly after surpassing 916,000 metres of genuine travelled distance and persists', () => {
  const storage = new MemoryProgressAdapter({
    lifetimeDistanceMetres: PLATINUM_DISTANCE_THRESHOLD_M - 10,
  });
  let platinumEvents = 0;
  const engine = new BostaEngine(
    {
      onPlatinumUnlock: () => {
        platinumEvents += 1;
      },
    },
    storage
  );
  engine.startNewRun('sylhet');
  assert.equal(engine.platinumUnlocked, false);

  // Coins & Gold cannot trigger Platinum
  engine.coins = 500_000;
  engine.gold = 999;
  engine.advanceGenuineDistance(10); // Exactly 916,000m (not strictly > 916,000m)
  assert.equal(engine.lifetimeDistanceMetres, PLATINUM_DISTANCE_THRESHOLD_M);
  assert.equal(engine.platinumUnlocked, false, 'Must cross strictly beyond 916,000m');
  assert.equal(platinumEvents, 0);

  // Crossing beyond 916,000m triggers Platinum unlock once + toast + persistence
  engine.advanceGenuineDistance(0.5);
  assert.equal(engine.platinumUnlocked, true);
  assert.equal(platinumEvents, 1);
  assert.ok(engine.achievementToast?.title.includes('Platinum'));
  assert.equal(storage.load().platinumUnlocked, true);

  // Reloading new engine preserves Platinum status and never double-fires
  const engineReloaded = new BostaEngine(
    {
      onPlatinumUnlock: () => {
        platinumEvents += 1;
      },
    },
    storage
  );
  assert.equal(engineReloaded.platinumUnlocked, true);
  engineReloaded.advanceGenuineDistance(100);
  assert.equal(platinumEvents, 1, 'Platinum unlock chime does not re-trigger once unlocked');
});
