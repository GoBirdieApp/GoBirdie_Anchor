
/* global shot shape presets  OTTOM1, 10.08.2026 */

export type ShotShapeId = 'straight' | 'baby_draw' | 'baby_fade' | 'big_draw' | 'big_fade';

export interface ShotShapePreset {
  id: ShotShapeId;
  label: string;
  /** LM spin axis: negative=draw, positive=fade. 
   * OTTOM1, 10.08.2026 */
  spinAxisDeg: number;

  /** Launch direction vs target: +right, -left.*/
  launchDirectionDeg: number;
}




export const SHOT_SHAPE_PRESETS: Record<ShotShapeId, ShotShapePreset> = {
  straight: {
    id: 'straight',
    label: 'Straight',
    spinAxisDeg: 0,
    launchDirectionDeg: 0,
  },
  baby_draw: {
    id: 'baby_draw',
    label: 'Baby draw',
    spinAxisDeg: -5,
    launchDirectionDeg: 2.5,
  },
  baby_fade: {
    id: 'baby_fade',
    label: 'Baby fade',
    spinAxisDeg: 5,
    launchDirectionDeg: -2.5,
  },
  big_draw: {
    id: 'big_draw',
    label: 'Big draw',
    spinAxisDeg: -12,
    launchDirectionDeg: 5,
  },
  big_fade: {
    id: 'big_fade',
    label: 'Big fade',
    spinAxisDeg: 12,
    launchDirectionDeg: -5,
  },
};

export const SHOT_SHAPE_BUTTON_IDS: Exclude<ShotShapeId, 'straight'>[] = [
  'baby_draw',
  'baby_fade',
  'big_draw',
  'big_fade',
];
