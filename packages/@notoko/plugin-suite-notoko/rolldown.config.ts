import Path from "node:path";
import FS from "node:fs";

import { defineConfig, type RolldownOptions } from "rolldown";
import copy from "rollup-plugin-copy";
import license from "rollup-plugin-license";

import { parse } from "jsonc-parser";
import { match } from "ts-pattern";

const external = [
  "zod/v4",
  "ts-pattern",
  "es-toolkit",
  "solid-js",
  /^(\.\/)?(\.\.\/)*resources\//,
];

const pluginIds = [
  "notoko",
  "notoko.stock",
  "notoko.connectors.json_api",
] as const;

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
                .relative("src", Path.dirname(fullPath));
              return Path.join(relativeDir, `${stub}.json`);
            },
            transform: (contents) => JSON.stringify(parse(contents.toString())),
          })),
      }),
    ],
  },
  ...pluginIds.map((id): RolldownOptions => ({
    input: `src/${id}/mod.ts`,
    output: { file: `dist/${id}/handlers.js`, format: "esm", minify: true },
    external,
    plugins: [
      license({
        thirdParty: {
          output: {
            file: `dist/${id}/third-party-licenses.txt`,
          },
        },
      }),
      ...match(id)
        .with("notoko.stock", () => [
          copy({
            targets: [
              {
                src: "node_modules/@pinyin-pro/data/json/complete.json",
                dest: "dist/notoko.stock/resources/pinyin-pro/",
                rename: () => "dict-complete.json",
              },
              {
                src:
                  "src/notoko.stock/resources/fastspeech2-pinyin-r/processed.csv.json",
                dest: "dist/notoko.stock/resources/fastspeech2-pinyin-r/",
                rename: () => "processed.csv.json",
              },
            ],
          }),
        ])
        .otherwise(() => []),
    ],
  })),
  ...pluginIds.flatMap((id): RolldownOptions[] => {
    const uiFolderPath = `src/${id}/ui`;
    if (!FS.existsSync(uiFolderPath)) return [];

    const files = FS.readdirSync(uiFolderPath, { withFileTypes: true })
      .filter((dirent) => dirent.isFile());

    return files.map((file): RolldownOptions => {
      const stem = getStemName(file.name);
      return {
        input: `src/${id}/ui/${file.name}`,
        output: {
          file: `dist/${id}/ui/${stem}.js`,
          format: "esm",
          minify: true,
        },
        external,
        plugins: [
          license({
            thirdParty: {
              output: {
                file: Path.join(
                  `dist/${id}/ui/${stem}.third-party-licenses.txt`,
                ),
              },
            },
          }),
        ],
      };
    });
  }),
]);

function getStemName(fileName: string): string {
  if (fileName.indexOf("/") >= 0) throw new Error("NOT SUPPORTED");
  const index = fileName.lastIndexOf(".");
  if (index === -1) return fileName;
  return fileName.slice(0, index);
}
