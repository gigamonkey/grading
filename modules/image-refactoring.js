import { createCanvas } from 'canvas';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const WIDTH = 800;
const HEIGHT = 500;

let cachedGraphicsSource = null;

function loadGraphicsSource() {
  if (cachedGraphicsSource === null) {
    const file = path.join(import.meta.dirname, '..', 'graphics.js');
    cachedGraphicsSource = readFileSync(file, 'utf-8');
  }
  return cachedGraphicsSource;
}

export function render({ codeSource, graphicsSource }) {
  const graphics = graphicsSource ?? loadGraphicsSource();
  try {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const m = Object.create(Math);
    m.random = () => 0.5;
    const context = { canvas, Math: m };
    vm.createContext(context);
    new vm.Script(graphics).runInContext(context);
    new vm.Script('clear()').runInContext(context);
    new vm.Script(codeSource).runInContext(context);
    return { png: canvas.toBuffer('image/png') };
  } catch (e) {
    return { error: e.message };
  }
}

export const CANVAS_WIDTH = WIDTH;
export const CANVAS_HEIGHT = HEIGHT;
