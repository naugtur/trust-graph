const { writeFileSync } = require("fs");
const stringify = require("json-stable-stringify");
const { getAssertionId } = require("./assertion-matcher");

/**
 * Scale node size based on trust score
 * @param {number} score - Trust score to scale
 * @returns {number} - Font size for visualization
 */
function scale(score) {
  return Math.round(12 + 7 * Math.log10(1 + 60 * score));
}

/**
 * Aggregate edge values for display
 * @param {Array<string>} values - Values to aggregate
 * @returns {string} - Formatted string for edge label
 */
function aggregate(values) {
  const self = values.filter((value) => value === "X").length;
  const paths = values.filter((value) => value !== "X");
  const sum = paths
    .reduce((acc, value) => acc + parseFloat(value), 0)
    .toFixed(3);
  return `" score:${sum}, <br> paths:${paths.length}, <br> circular:${self}"`;
}

/**
 * Generate visualization from trust data
 * @param {Object} trust - Trust graph data
 * @param {string} outputFile - File name to save visualization (without extension)
 */
function visualizeTrustGraph(trust, outputFile = "computed_trust") {
  // Save raw trust data as JSON
  writeFileSync(`${outputFile}.json`, stringify(trust, { space: 2 }));

  // Generate Mermaid graph
  const mermaid = ["graph TD"];
  const nodeIds = Object.keys(trust);
  const edges = {};

  // Add nodes
  for (const [node, data] of Object.entries(trust)) {
    mermaid.push(
      `  ${nodeIds.indexOf(node)}["**${data.score.toFixed(3)}**<br>${node}"]`
    );

    // Process edges
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

    // Style nodes based on score
    mermaid.push(
      `style ${nodeIds.indexOf(node)} font-size:${scale(data.score)}px;`
    );
  }

  // Add edges
  for (const [edge, values] of Object.entries(edges)) {
    const [source, target] = edge.split("-");
    mermaid.push(`  ${source} -->|${aggregate(values)}| ${target}`);
  }

  // Save as markdown file
  writeFileSync(
    `${outputFile}.md`,
    "\n```mermaid\n" + mermaid.join("\n") + "\n```"
  );
  console.log(`>> written >> Trust computation graph: ${outputFile}.md`);
}

/**
 * Generate a Mermaid graph and documentation from debug data
 * @param {Array<AssertionDebug>} debugData - Debug data from sentiment analysis
 * @param {Array} allAssertions - All assertion objects
 * @returns {string} Markdown with Mermaid graph and assertion details
 */
function generateDebugVisualization(
  debugData,
  outputFile = "sentiment_debug",
  allAssertions = []
) {
  if (!debugData || !Array.isArray(debugData) || debugData.length === 0) {
    console.warn("No debug data available for visualization");
    return "";
  }

  // Store all assertions for documentation
  const assertionNodes = new Map();
  const assertionObjects = new Map();

  // Find original assertion objects by ID
  if (Array.isArray(allAssertions)) {
    allAssertions.forEach((assertion) => {
      const id = getAssertionId(assertion);
      assertionObjects.set(id, assertion);
    });
  }

  // Process debug tree to collect all assertions
  function collectAssertions(node) {
    if (!node) return;
    assertionNodes.set(node.id, node);

    if (node.children && node.children.length > 0) {
      node.children.forEach(collectAssertions);
    }
  }

  debugData.forEach(collectAssertions);

  // Create array of all node IDs for indexing
  const nodeIds = Array.from(assertionNodes.keys());

  // Generate Mermaid graph definition
  let mermaidGraph = `
# Sentiment on a subject from trust graph assertions

> click on assertion ID to jump to details

`+"```mermaid\ngraph RL\n";

  // Map node connections
  function addNodeConnections(node, parentId = null) {
    if (!node) return;

    const nodeSign = node.direction >= 0 ? "👍🟢" : "👎🔴";
    const nodeIndex = nodeIds.indexOf(node.id);

    // Add this node
    mermaidGraph += `  ${nodeIndex}["${nodeSign} <a href='#assertion-${encodeURIComponent(
      node.id
    )}'>${node.id}</a> <br>${node.total} = ${node.scores
      .map((s) => s.toFixed(3))
      .join(" + ")}"]\n`;

    // Connect to parent if any
    if (parentId !== null) {
      const parentIndex = nodeIds.indexOf(parentId);
      mermaidGraph += `  ${nodeIndex} --> ${parentIndex}\n`;
    }

    // Process children
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => {
        addNodeConnections(child, node.id);
      });
    }
  }

  // Start with top-level nodes
  debugData.forEach((rootNode) => {
    addNodeConnections(rootNode);
  });

  mermaidGraph += "```\n\n";

  // Generate documentation for each assertion
  mermaidGraph += `
  
## Assertion Details

`;

  assertionNodes.forEach((node, id) => {
    mermaidGraph += `### <a id="assertion-${encodeURIComponent(
      id
    )}"></a>Assertion: ${id}\n\n`;
    mermaidGraph += `- **Accumulated Score**: ${node.total}\n\n`;

    // Include the full assertion JSON
    const originalAssertion = assertionObjects.get(id);
    if (originalAssertion) {
      mermaidGraph += "```json\n";
      mermaidGraph += JSON.stringify(originalAssertion, null, 2);
      mermaidGraph += "\n```\n\n";
    } else {
      mermaidGraph += "*Assertion details not available*\n\n";
    }
  });

  // Write to file if outputFile is provided
  if (outputFile) {
    writeFileSync(`${outputFile}.md`, mermaidGraph);
    console.log(`>> written >> Sentiment graph: ${outputFile}.md`);
  }

  return mermaidGraph;
}

module.exports = {
  visualizeTrustGraph,
  generateDebugVisualization,
};
