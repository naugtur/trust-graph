const semver = require("semver");

/**
 * Matches assertions against a subject
 * @param {object} searchSubject - The subject to search for
 * @param {Array} assertions - Array of assertions to search through
 * @returns {Array} - Filtered array of matching assertions
 */
function matchAssertions(searchSubject, assertions) {
  return assertions.filter((assertion) =>
    matchSubject(searchSubject, assertion.subject)
  );
}

function isPackageObject(obj) {
  const keys = Object.keys(obj);
  return keys.length === 2 && keys.includes("name") && keys.includes("range");
}

function matchSubject(search, target) {
  if (
    !search ||
    !target ||
    typeof search !== "object" ||
    typeof target !== "object"
  ) {
    return search === target;
  }

  if (isPackageObject(search) || isPackageObject(target)) {
    return (
      search.name === target.name &&
      (!search.range ||
        // TODO: consider whether search with range should match an assertion without range
        !target.range ||
        semver.intersects(search.range, target.range))
    );
  }

  return Object.entries(search).every(([key, value]) => {
    if (!(key in target)) return false;
    if (typeof value === "object" && value !== null) {
      return matchSubject(value, target[key]);
    }
    return value === target[key];
  });
}

module.exports = matchAssertions;
