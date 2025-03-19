const fs = require("fs");
const { publish } = require("libnpmpublish");

const { createTarGzip } = require("nanotar");

const structureData = require("./structure.json");

const namify = (name) => name.split("/")[0].replace("@", "");

let mermaidGraph = "graph TD\n";
for (const [source, { dependencies }] of Object.entries(
  structureData
).reverse()) {
  for (const target of dependencies) {
    mermaidGraph += `    ${namify(source)} --> ${namify(target)}\n`;
  }
}

const markdown = "```mermaid\n" + mermaidGraph + "```\n";
fs.writeFileSync("structure.md", markdown);

const REGISTRY = "http://localhost:4873";
const NPM_TOKEN = process.env.NPM_TOKEN;

const VER = Math.floor(Date.now() / 10000) - 174237887;
async function createAndPublishPackage(name, packageData) {
  const { dependencies, ...rest } = packageData;
  const packageJson = {
    name: name,
    version: `1.0.0-${VER}`,
    description: `Trust graph entry by ${name}`,
    author: name.split("/")[0].replace("@", ""),
    license: "ISC",
    dependencies: dependencies.reduce((acc, dep) => {
      acc[dep] = "latest";
      return acc;
    }, {}),
    ...rest,
  };

  try {
    const tarball = await createTarGzip([
      { name: "package.json", data: JSON.stringify(packageJson, null, 2) },
    ]);

    const publishResult = await publish(packageJson, Buffer.from(tarball), {
      registry: REGISTRY,
      // algorithms: [],
      // '//localhost:4873/:_authToken': process.env.NPM_TOKEN
    });

    console.log(`Published ${name}`);
    return publishResult;
  } catch (error) {
    console.error(`Failed to publish ${name}:`, error.message);
  }
}

async function publishAllPackages() {
  for (const [name, data] of Object.entries(structureData)) {
    await createAndPublishPackage(name, data);
  }
  console.log("All packages published");
}

publishAllPackages().catch(console.error);
