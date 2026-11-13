import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PLAYER_CAM_OFFSET_X,
  createPerspectiveCamera,
  projectPoint,
} from './perspective';

test('reference 1366x642 places player in lower-center foreground with clear horizon', () => {
  const cam = createPerspectiveCamera(1366, 642, 0);
  const player = projectPoint(cam, PLAYER_CAM_OFFSET_X, 0, 0);
  const far = projectPoint(cam, 24, 0, 0);

  assert.ok(cam.horizonY > 200 && cam.horizonY < 260);
  assert.ok(Math.abs(player.x - 1366 * 0.5) < 1);
  assert.ok(player.y > 490 && player.y < 540, 'Player sits in lower-middle viewport');
  assert.ok(Math.abs(player.scale - 1.0) < 0.001, 'Reference scale at player depth is 1.0');
  assert.ok(far.y > cam.horizonY && far.y < player.y, 'Far road converges toward horizon');
  assert.ok(far.scale < 0.25, 'Distant objects shrink cleanly with distance');
});

test('three lanes stay strictly ordered and scale proportionally at desktop and mobile', () => {
  for (const [w, h] of [
    [1366, 642],
    [1920, 1080],
    [1280, 720],
    [390, 844],
  ]) {
    const cam = createPerspectiveCamera(w, h, 0);
    const left = projectPoint(cam, PLAYER_CAM_OFFSET_X, -1, 0);
    const center = projectPoint(cam, PLAYER_CAM_OFFSET_X, 0, 0);
    const right = projectPoint(cam, PLAYER_CAM_OFFSET_X, 1, 0);

    assert.ok(left.x < center.x && center.x < right.x, `Lanes ordered at ${w}x${h}`);
    assert.ok(left.x > 0 && right.x < w, `All 3 lanes fit inside ${w}x${h}`);
    assert.ok(center.y < h - 60, `Bottom clearance preserved at ${w}x${h}`);
  }
});
