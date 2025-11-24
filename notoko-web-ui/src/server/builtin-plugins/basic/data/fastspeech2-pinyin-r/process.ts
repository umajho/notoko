export {};

const input = await (async () => {
  let result = "";
  for await (const chunk of process.stdin) {
    result += chunk;
  }
  return result;
})();

let resultCsv = "";
const seen = new Set<string>();
for (const line of input.split("\n")) {
  if (!line.trim()) continue;

  const cols = line.split(/\s+/);
  if (cols.at(-1) === "rr") continue;

  const [fullT, init, finT] = ((): [string, string | null, string] => {
    switch (cols.length) {
      case 3:
        return cols as [string, string, string];
      case 2:
        return [cols[0]!, null, cols[1]!];
      default:
        throw new Error("?:" + line);
    }
  })();

  if ([fullT.at(-1), finT.at(-1)].some((c) => !/\d/.test(c!))) {
    throw new Error("??");
  }
  const full = fullT.slice(0, -1);
  if (seen.has(full)) continue;
  const fin = finT.slice(0, -1);

  resultCsv += [full, init ?? "", fin].join(",") + "\n";
  seen.add(full);
}

process.stdout.write(resultCsv.trim());
