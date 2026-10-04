export const READING_POSITION_KEY = "xr-reading-positions";
const MAX_POSITIONS = 20;
const RESUME_MIN = 0.08;
const RESUME_MAX = 0.9;

export type ReadingPosition = {
  postId: string;
  slug: string;
  title: string;
  revision: string;
  progress: number;
  updatedAt: number;
};

function isPosition(value: unknown): value is ReadingPosition {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ReadingPosition>;
  return typeof item.postId === "string"
    && typeof item.slug === "string"
    && typeof item.title === "string"
    && typeof item.revision === "string"
    && typeof item.progress === "number"
    && Number.isFinite(item.progress)
    && typeof item.updatedAt === "number"
    && Number.isFinite(item.updatedAt);
}

export function parseReadingPositions(raw: string | null): ReadingPosition[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(isPosition).slice(0, MAX_POSITIONS);
  } catch {
    return [];
  }
}

export function readReadingPosition(
  storage: Pick<Storage, "getItem">,
  postId: string,
  revision: string
): ReadingPosition | null {
  const position = parseReadingPositions(storage.getItem(READING_POSITION_KEY))
    .find((item) => item.postId === postId && item.revision === revision);
  if (!position || position.progress < RESUME_MIN || position.progress >= RESUME_MAX) return null;
  return position;
}

export function saveReadingPosition(
  storage: Pick<Storage, "getItem" | "setItem">,
  position: ReadingPosition
): void {
  const progress = Math.max(0, Math.min(1, position.progress));
  const previous = parseReadingPositions(storage.getItem(READING_POSITION_KEY));
  const next = [{ ...position, progress }, ...previous.filter((item) => item.postId !== position.postId)]
    .slice(0, MAX_POSITIONS);
  storage.setItem(READING_POSITION_KEY, JSON.stringify(next));
}

export function removeReadingPosition(
  storage: Pick<Storage, "getItem" | "setItem">,
  postId: string
): void {
  const next = parseReadingPositions(storage.getItem(READING_POSITION_KEY))
    .filter((item) => item.postId !== postId);
  storage.setItem(READING_POSITION_KEY, JSON.stringify(next));
}
