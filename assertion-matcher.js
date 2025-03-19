const semver = require('semver')

/**
 * Matches assertions against a subject
 * @param {object} searchSubject - The subject to search for
 * @param {Array} assertions - Array of assertions to search through
 * @returns {Array} - Filtered array of matching assertions
 */
function matchassertions(searchSubject, assertions) {
  return assertions.filter(assertion => matchSubject(searchSubject, assertion.subject))
}

function matchSubject(searchSubject, assertionSubject) {
  // Handle different subject types
  if ('pkg' in searchSubject) {
    if (!assertionSubject.pkg) return false
    return matchPkg(searchSubject.pkg, assertionSubject.pkg)
  }

  if ('dependency' in searchSubject) {
    if (!assertionSubject.dependency) return false
    return matchDependency(searchSubject.dependency, assertionSubject.dependency)
  }

  if ('flaw' in searchSubject) {
    if (!assertionSubject.flaw) return false
    return matchFlaw(searchSubject.flaw, assertionSubject.flaw)
  }

  if ('assertion' in searchSubject) {
    if (!assertionSubject.assertion) return false
    return matchassertion(searchSubject.assertion, assertionSubject.assertion)
  }

  return false
}

function matchPkg(search, target) {
  if (search.name !== target.name) return false
  if (search.range && target.range) {
    return semver.intersects(search.range, target.range)
  }
  return true
}

function matchDependency(search, target) {
  return matchPkg(search.dependent, target.dependent) &&
    matchPkg(search.pkg, target.pkg)
}

function matchFlaw(search, target) {
  return Object.entries(search).every(([key, value]) => 
    target[key] === value
  )
}

function matchassertion(search, target) {
  return search.issuer === target.issuer &&
    search.issuerSpecificID === target.issuerSpecificID
}

module.exports = matchassertions