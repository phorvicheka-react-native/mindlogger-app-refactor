export type Point = {
  x: number;
  y: number;
};

export type DrawPoint = {
  time: number;
} & Point;

export type DrawLine = {
  points: DrawPoint[];
  startTime: number;
};

export type DrawResult = {
  lines: DrawLine[];
  svgString: string;
  width: number;
};