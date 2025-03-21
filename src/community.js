const { processTrustGraph } = require('./trust-computer');
const matchAssertions = require('./assertion-matcher');

/**
 * @typedef {Object} CommunityTrust
 * @property {Array<Object>} assertions - List of assertions with their trust scores
 * @property {Object} stats - Statistics about the trust computation
 */

/**
 * @typedef {Object} SentimentSummary
 * @property {Array} matches - Matching assertions sorted by trust score
 * @property {number} total - Overall sentiment score
 * @property {number} endorsements - Count of endorsements
 * @property {number} disputes - Count of disputes
 * @property {Array<number>} scores - Array of all trust-weighted scores
 * @property {Object} debug - Debug information for score computation
 */

/**
 * @typedef {Object} AssertionDebug
 * @property {string} id - Unique identifier (issuer + issuerSpecificId)
 * @property {number} score - Score contribution
 * @property {string} type - Assertion type
 * @property {number} trust - Trust score
 * @property {Array<AssertionDebug>} children - Meta-assertions about this assertion
 */

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Processes trust graph and collects assertions from trusted nodes
 * @param {string} packageJsonPath - Path to the root package.json
 * @returns {Promise<CommunityTrust>}
 */
async function getAssertionsFromCommunity(packageJsonPath = 'package.json') {
  const { trust, stats } = processTrustGraph(packageJsonPath);
  const fetchPromises = [];

  // Prepare all fetch operations
  for (const [nodeId, node] of Object.entries(trust)) {
    if (!node.assertions || !node.assertions.url) continue;

    fetchPromises.push(
      fetchJson(node.assertions.url)
        .then(assertionsData => {
          // Validate that assertions come from the correct issuer
          const ownAssertions = assertionsData.filter(assertion =>
            assertion.issuer === nodeId
          );

          // Sprinkle some trust scores in.
          return ownAssertions.map(assertion => ({
            ...assertion,
            trust: node.score,
          }));
        })
        .catch(error => {
          console.warn(`Failed to fetch assertions from ${node.assertions.url}:`, error.message);
          return []; // Return empty array for failed fetches
        })
    );
  }

  const assertionsArrays = await Promise.all(fetchPromises);
  const assertionsWithTrust = assertionsArrays.flat();

  return {
    assertions: assertionsWithTrust,
    stats
  };
}

/**
 * Create a unique ID for an assertion
 * @param {Object} assertion - The assertion
 * @returns {string} Unique ID
 */
function getAssertionId(assertion) {
  return `${assertion.issuer}-${assertion.issuerSpecificId}`;
}

/**
 * Compute sentiment scores for an assertion with debug info
 * @param {Object} assertion - Assertion to analyze
 * @param {Array} allAssertions - Complete set of assertions
 * @param {Set} visited - Set of already visited assertion IDs to prevent cycles
 * @returns {Object} Object containing scores and debug info
 */
function computeAssertionScores(assertion, allAssertions, visited = new Set()) {
  const assertionId = getAssertionId(assertion);
  
  // Prevent infinite recursion by tracking visited assertions
  if (visited.has(assertionId)) {
    return { 
      scores: [],
      debug: null 
    };
  }
  
  // Mark this assertion as visited
  visited.add(assertionId);
  
  // Base score from the assertion itself
  const baseScore = assertion.type === 'dispute' ? -1 : 1;
  const weightedScore = baseScore * assertion.trust;
  
  // Create debug object
  const debug = {
    id: assertionId,
    score: weightedScore,
    type: assertion.type,
    trust: assertion.trust,
    children: []
  };
  
  // Initial scores array
  const scores = [weightedScore];

  // Look for meta-assertions (assertions about this assertion)
  const metaMatches = matchAssertions({
    issuer: assertion.issuer,
    issuerSpecificId: assertion.issuerSpecificId
  }, allAssertions);

  if (metaMatches.length > 0) {
    // Recursively compute scores for meta-assertions
    metaMatches.forEach(meta => {
      const metaResult = computeAssertionScores(meta, allAssertions, new Set(visited));
      
      if (metaResult.debug) {
        debug.children.push(metaResult.debug);
        scores.push(...metaResult.scores);
      }
    });
  }

  return {
    scores,
    debug
  };
}

/**
 * Find matching assertions for a subject and analyze community sentiment
 * @param {object} subject - Subject to match against
 * @param {Array} assertions - List of assertions with trust scores
 * @returns {SentimentSummary} - Matching assertions and sentiment analysis
 */
function getCommunitySentiment(subject, assertions) {
  const matches = matchAssertions(subject, assertions);
  
  // Sort matches by trust score
  const sortedMatches = matches.sort((a, b) => b.trust - a.trust);

  // Compute scores for all matches including their meta-assertions
  const computationResults = sortedMatches.map(match => 
    computeAssertionScores(match, assertions)
  );
  
  const allScores = computationResults.flatMap(result => result.scores);
  const debugTree = computationResults.map(result => result.debug);

  // Count endorsements and disputes
  const endorsements = sortedMatches.filter(m => m.type === 'endorsement').length;
  const disputes = sortedMatches.filter(m => m.type === 'dispute').length;

  // Calculate total sentiment
  const total = allScores.reduce((sum, score) => sum + score, 0);

  return {
    matches: sortedMatches,
    total,
    endorsements,
    disputes,
    scores: allScores,
    debug: debugTree,
    // Include visualization function that captures the current state
    generateVisualization: () => generateDebugVisualization(debugTree, assertions)
  };
}

/**
 * Generate a Mermaid graph and documentation from debug data
 * @param {Array<AssertionDebug>} debugData - Debug data from sentiment analysis
 * @param {Array} allAssertions - All assertion objects
 * @returns {string} Markdown with Mermaid graph and assertion details
 */
function generateDebugVisualization(debugData, allAssertions) {
  // Store all assertions for documentation
  const assertionNodes = new Map();
  const assertionObjects = new Map();
  
  // Find original assertion objects by ID
  allAssertions.forEach(assertion => {
    const id = getAssertionId(assertion);
    assertionObjects.set(id, assertion);
  });
  
  // Process debug tree to collect all assertions
  function collectAssertions(node) {
    if (!node) return;
    assertionNodes.set(node.id, node);
    
    if (node.children && node.children.length > 0) {
      node.children.forEach(collectAssertions);
    }
  }
  
  debugData.forEach(collectAssertions);
  
  // Generate Mermaid graph definition
  let mermaidGraph = '```mermaid\ngraph TD\n';
  
  // Map node connections
  function addNodeConnections(node, parentId = null) {
    if (!node) return;
    
    const nodeSign = node.score >= 0 ? '👍' : '👎';
    const scoreValue = Math.abs(node.score).toFixed(2);
    
    // Add this node
    mermaidGraph += `  ${node.id}["${nodeSign} <a href='#assertion-${node.id}' >${node.id}</a> (${scoreValue})"]`;
    
    // Connect to parent if any
    if (parentId) {
      mermaidGraph += `  ${parentId} --> ${node.id}\n`;
    }
    
    // Process children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        addNodeConnections(child, node.id);
      });
    }
  }
  
  // Start with top-level nodes
  debugData.forEach(rootNode => {
    addNodeConnections(rootNode);
  });
  
  mermaidGraph += '```\n\n';
  
  // Generate documentation for each assertion
  mermaidGraph += '## Assertion Details\n\n';
  
  assertionNodes.forEach((node, id) => {
    mermaidGraph += `### <a id="assertion-${id}"></a>Assertion: ${id}\n\n`;
    mermaidGraph += `- **Weighted Score**: ${node.score.toFixed(4)}\n\n`;
    
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
  
  return mermaidGraph;
}

module.exports = {
  getAssertionsFromCommunity,
  getCommunitySentiment,
  generateDebugVisualization
};