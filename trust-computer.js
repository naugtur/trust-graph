const { execSync } = require("child_process");
const { readFileSync, writeFileSync } = require("fs");
const path = require("path");
const stringify = require("json-stable-stringify");

function getPackageJson(packageName) {
  try {
    const packagePath = require.resolve(packageName + "/package.json", {
      paths: [path.join(process.cwd(), "node_modules")],
    });
    return JSON.parse(readFileSync(packagePath));
  } catch (error) {
    console.error(
      `Error reading package.json for ${packageName}:`,
      error.message
    );
    return {};
  }
}

function getValidDeps(packageJson) {
  return Object.keys(packageJson.dependencies || {}).filter((dep) =>
    dep.endsWith("/i_trust")
  );
}

function computeTrust({
  dependencies = [],
  parentTrust = 1,
  result,
  currentPath = [],
} = {}) {
  const trustPerDep = parentTrust / dependencies.length;

  const next = [];

  for (const dep of dependencies) {
    let firstVisit = false;
    if (!result[dep]) {
      result[dep] = {
        score: 0,
        assertions: null,
        via: [],
      };
      firstVisit = true;
    }

    const pathToThis = [...currentPath, dep];

    // Avoid acumulating trust from own dependencies
    if (!currentPath.includes(dep)) {
      result[dep].score += trustPerDep;
      result[dep].via.push(currentPath.join(">") + ":" + trustPerDep);
    } else {
      result[dep].via.push(currentPath.join(">") + ":X");
    }

    if (firstVisit) {
      const packageJson = getPackageJson(dep);
      result[dep].assertions = packageJson.assertions;
      const validDeps = getValidDeps(packageJson);

      if (validDeps.length > 0) {
        next.push({
          dependencies: validDeps,
          currentPath: pathToThis,
          parentTrust: trustPerDep,
          result,
        });
      }
    }
  }

  return next;
}

function processTrustGraph(packageJsonPath = "package.json") {
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, { encoding: "utf-8" })
  );

  const result = {};
  const next = [{ dependencies: getValidDeps(packageJson), result }];

  while (next.length > 0) {
    const current = next.shift();
    const nextBatch = computeTrust(current);
    next.push(...nextBatch);
  }
  return result;
}

function scale(score) {
  return Math.round(12 + 8 * Math.log10(1 + 60 * score));
}

function main() {
  const result = processTrustGraph(path.join(process.cwd(), "package.json"));

  writeFileSync("computed_trust.json", stringify(result, { space: 2 }));

  const mermaid = ["graph TD"];
  const nodeIds = Object.keys(result);
  for (const [node, data] of Object.entries(result)) {
    mermaid.push(
      `  ${nodeIds.indexOf(node)}["**${data.score.toFixed(2)}**  ${node}"]`
    );
    for (const edge of data.via) {
      const [path, value] = edge.split(":");
      const source = path.split(">").slice(-1)[0];
      if (source) {
        if (value === "X") {
          mermaid.push(`  ${nodeIds.indexOf(source)} -..->|X| ${nodeIds.indexOf(node)}`);
        } else {
          mermaid.push(
            `  ${nodeIds.indexOf(source)} --->|${parseFloat(value).toFixed(
              2
            )}| ${nodeIds.indexOf(node)}`
          );
        }
      }
    }
    mermaid.push(
      `style ${nodeIds.indexOf(node)} font-size:${scale(data.score)}px;`
    );
  }
  writeFileSync(
    "computed_trust.md",
    "\n```mermaid\n" + mermaid.join("\n") + "\n```"
  );
}

main();
