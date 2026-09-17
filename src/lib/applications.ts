import { promises as fs } from "fs";
import path from "path";

export type ApplicationRecord = {
  id: string;
  createdAt: string;
  childName: string;
  age: string;
  parentPhone: string;
  clubTitle: string;
  comment: string;
  consent: boolean;
};

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "applications.json");

/** Serializes concurrent writes so two near-simultaneous submissions can't clobber each other. */
let writeQueue: Promise<unknown> = Promise.resolve();

async function readAllUnsafe(): Promise<ApplicationRecord[]> {
  try {
    const raw = await fs.readFile(FILE_PATH, "utf-8");
    return JSON.parse(raw) as ApplicationRecord[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function readAllApplications(): Promise<ApplicationRecord[]> {
  const all = await readAllUnsafe();
  return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function appendApplication(record: ApplicationRecord): Promise<void> {
  const task = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const all = await readAllUnsafe();
    all.push(record);
    await fs.writeFile(FILE_PATH, JSON.stringify(all, null, 2), "utf-8");
  });
  writeQueue = task.catch(() => {});
  return task;
}

export function deleteApplication(id: string): Promise<void> {
  const task = writeQueue.then(async () => {
    const all = await readAllUnsafe();
    const remaining = all.filter((a) => a.id !== id);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE_PATH, JSON.stringify(remaining, null, 2), "utf-8");
  });
  writeQueue = task.catch(() => {});
  return task;
}
