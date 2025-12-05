import Path from "node:path";

import { defineConfig, type RolldownOptions } from "rolldown";
import copy from "rollup-plugin-copy";
import license from "rollup-plugin-license";

import { parse } from "jsonc-parser";
import { match } from "ts-pattern";

const external = ["zod/v4", "ts-pattern"];

export default defineConfig([
  {
    input: "src/dummy.js",
    output: { file: "/dev/null" },
    plugins: [
      copy({
        targets: ["__notoko_plugin__", "__notoko_plugin_container__"]
          .map((stub) => ({
            src: `src/**/${stub}.jsonc`,
            dest: "dist",
            rename: (_1, _2, fullPath) => {
              const relativeDir = Path
                .relative(Path.join(__dirname, "src"), Path.dirname(fullPath));
              return Path.join(relativeDir, `${stub}.json`);
            },
            transform: (contents) => JSON.stringify(parse(contents.toString())),
          })),
      }),
    ],
  },
  ...([
    "notoko.connectors.json_api",
    "notoko.stock",
  ] as const).map((id): RolldownOptions => ({
    input: `src/${id}/mod.ts`,
    output: { file: `dist/${id}/handlers.js`, format: "esm", minify: true },
    ...match(id)
      .with("notoko.stock", () => ({
        external: [...external, /^(\.\/)?(\.\.\/)*data\//],
      })).otherwise(() => ({ external })),
    plugins: [
      license({
        thirdParty: {
          output: {
            file: Path.join(__dirname, "dist", id, "third-party-licenses.txt"),
          },
        },
      }),
      ...match(id)
        .with("notoko.stock", () => [
          copy({
            targets: [
              {
                src: "node_modules/@pinyin-pro/data/json/complete.json",
                dest: "dist/notoko.stock/data/pinyin-pro/",
                rename: () => "dict-complete.json",
              },
              {
                src:
                  "src/notoko.stock/data/fastspeech2-pinyin-r/processed.csv.json",
                dest: "dist/notoko.stock/data/fastspeech2-pinyin-r/",
                rename: () => "processed.csv.json",
              },
            ],
          }),
        ])
        .otherwise(() => []),
    ],
  })),
]);
