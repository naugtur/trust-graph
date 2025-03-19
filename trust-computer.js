const { execSync } = require("child_process");
const { readFileSync } = require("fs");
const path = require("path");
const stringify = require('json-stable-stringify');

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

function main() {
  const packageJson = JSON.parse(
    readFileSync(path.join(process.cwd(), "package.json"))
  );

  const result = {};
  const next = [{ dependencies: getValidDeps(packageJson), result }];

  while (next.length > 0) {
    const current = next.shift();
    const nextBatch = computeTrust(current);
    next.push(...nextBatch);
  }

  console.log(stringify(result, { space: 2 }));
}

main();
