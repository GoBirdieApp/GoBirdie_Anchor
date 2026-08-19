
import { clamp } from '../utils/math.js';

export interface Bound {
  min: number;
  max: number;
}

export interface SimplexOptions {
  maxEvaluations?: number;

  tolerance?: number;
}

export interface SimplexResult {
  point: number[];
  value: number;
  evaluations: number;
}

const REFLECT = 1;
const EXPAND = 2;
const CONTRACT = 0.5;
const SHRINK = 0.5;


export function nelderMead(
  objective: (point: readonly number[]) => number,
  start: readonly number[],
  steps: readonly number[],
  bounds: readonly Bound[],
  options: SimplexOptions = {},
): SimplexResult {
  const n = start.length;
  const maxEvaluations = options.maxEvaluations ?? 200;
  const tolerance = options.tolerance ?? 1e-3;

  let evaluations = 0;
  const project = (point: readonly number[]): number[] =>
    point.map((value, i) => clamp(value, bounds[i]!.min, bounds[i]!.max));
  const evaluate = (point: readonly number[]): number => {
    evaluations += 1;
    return objective(project(point));
  };

  const vertices: number[][] = [project(start)];
  for (let i = 0; i < n; i += 1) {
    const vertex = [...vertices[0]!];
    const step = steps[i]!;
    const room = bounds[i]!.max - vertex[i]!;
    vertex[i] = vertex[i]! + (room >= step ? step : -step);
    vertices.push(project(vertex));
  }

  let values = vertices.map((vertex) => evaluate(vertex));

  const order = (): void => {
    const index = vertices.map((_, i) => i).sort((a, b) => values[a]! - values[b]!);
    const sortedVertices = index.map((i) => vertices[i]!);
    const sortedValues = index.map((i) => values[i]!);
    for (let i = 0; i < vertices.length; i += 1) {
      vertices[i] = sortedVertices[i]!;
      values[i] = sortedValues[i]!;
    }
  };

  const converged = (): boolean => {
    for (let d = 0; d < n; d += 1) {
      let low = Infinity;
      let high = -Infinity;
      for (const vertex of vertices) {
        low = Math.min(low, vertex[d]!);
        high = Math.max(high, vertex[d]!);
      }
      if (high - low > steps[d]! * tolerance) return false;
    }
    return true;
  };

  order();

  while (evaluations < maxEvaluations && !converged()) {
    const worst = n;
    const centroid = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i += 1) {
      for (let d = 0; d < n; d += 1) centroid[d] = centroid[d]! + vertices[i]![d]! / n;
    }

    const along = (factor: number): number[] =>
      centroid.map((value, d) => value + factor * (value - vertices[worst]![d]!));

    const reflected = along(REFLECT);
    const reflectedValue = evaluate(reflected);

    if (reflectedValue < values[0]!) {
      const expanded = along(EXPAND);
      const expandedValue = evaluate(expanded);
      if (expandedValue < reflectedValue) {
        vertices[worst] = project(expanded);
        values[worst] = expandedValue;
      } else {
        vertices[worst] = project(reflected);
        values[worst] = reflectedValue;
      }
    } else if (reflectedValue < values[worst - 1]!) {
      vertices[worst] = project(reflected);
      values[worst] = reflectedValue;
    } else {
      const contracted = along(-CONTRACT);
      const contractedValue = evaluate(contracted);
      if (contractedValue < values[worst]!) {
        vertices[worst] = project(contracted);
        values[worst] = contractedValue;
      } else {
        for (let i = 1; i <= worst; i += 1) {
          vertices[i] = project(
            vertices[i]!.map((value, d) => vertices[0]![d]! + SHRINK * (value - vertices[0]![d]!)),
          );
          values[i] = evaluate(vertices[i]!);
        }
      }
    }

    order();
  }

  return { point: vertices[0]!, value: values[0]!, evaluations };
}
