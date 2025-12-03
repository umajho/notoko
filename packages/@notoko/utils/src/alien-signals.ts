import { endBatch, setActiveSub, startBatch } from "alien-signals";

export function untrack<T>(block: () => T): T {
  const currentSub = setActiveSub();
  try {
    return block();
  } finally {
    setActiveSub(currentSub);
  }
}

export function batch(block: () => void) {
  startBatch();
  try {
    block();
  } finally {
    endBatch();
  }
}
