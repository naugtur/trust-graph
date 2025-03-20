const { writeFileSync } = require("fs");
const path = require("path");
const stringify = require("json-stable-stringify");

const { processTrustGraph } = require("./src/trust-computer");

function scale(score) {
  return Math.round(12 + 7 * Math.log10(1 + 60 * score));
}
function aggregate(values) {
  const self = values.filter((value) => value === "X").length;
  const paths = values.filter((value) => value !== "X");
  const sum = paths
    .reduce((acc, value) => acc + parseFloat(value), 0)
    .toFixed(3);
  return `" score:${sum}, <br> paths:${paths.length}, <br> circular:${self}"`;
}

function main() {
  const { trust, stats } = processTrustGraph(
    path.join(process.cwd(), "package.json")
  );

  console.log(
    `Processed ${stats.count} paths, skipped going further down ${stats.skip} more because their trust score was below threshold.`
  );

  writeFileSync("computed_trust.json", stringify(trust, { space: 2 }));

  const mermaid = ["graph TD"];
  const nodeIds = Object.keys(trust);
  const edges = {};
  for (const [node, data] of Object.entries(trust)) {
    mermaid.push(
      `  ${nodeIds.indexOf(node)}["**${data.score.toFixed(3)}**<br>${node}"]`
    );

    for (const edge of data.via) {
      const [path, value] = edge.split(":");
      const source = path.split(">").slice(-1)[0];
      if (source) {
        const edgeId = `${nodeIds.indexOf(source)}-${nodeIds.indexOf(node)}`;
        if (!edges[edgeId]) {
          edges[edgeId] = [];
        }
        edges[edgeId].push(
          typeof value === "number" ? parseFloat(value).toFixed(3) : value
        );
      }
    }

    mermaid.push(
      `style ${nodeIds.indexOf(node)} font-size:${scale(data.score)}px;`
    );
  }

  for (const [edge, values] of Object.entries(edges)) {
    const [source, target] = edge.split("-");
    mermaid.push(`  ${source} -->|${aggregate(values)}| ${target}`);
  }

  writeFileSync(
    "computed_trust.md",
    "\n```mermaid\n" + mermaid.join("\n") + "\n```"
  );
}

main();
