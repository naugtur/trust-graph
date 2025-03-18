const semver = require('semver')

/**
 * Matches attestations against a subject
 * @param {object} searchSubject - The subject to search for
 * @param {Array} attestations - Array of attestations to search through
 * @returns {Array} - Filtered array of matching attestations
 */
function matchAttestations(searchSubject, attestations) {
  return attestations.filter(attestation => matchSubject(searchSubject, attestation.subject))
}

function matchSubject(searchSubject, attestationSubject) {
  // Handle different subject types
  if ('pkg' in searchSubject) {
    if (!attestationSubject.pkg) return false
    return matchPkg(searchSubject.pkg, attestationSubject.pkg)
  }

  if ('dependency' in searchSubject) {
    if (!attestationSubject.dependency) return false
    return matchDependency(searchSubject.dependency, attestationSubject.dependency)
  }

  if ('flaw' in searchSubject) {
    if (!attestationSubject.flaw) return false
    return matchFlaw(searchSubject.flaw, attestationSubject.flaw)
  }

  if ('attestation' in searchSubject) {
    if (!attestationSubject.attestation) return false
    return matchAttestation(searchSubject.attestation, attestationSubject.attestation)
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

function matchAttestation(search, target) {
  return search.issuer === target.issuer &&
    search.issuerSpecificID === target.issuerSpecificID
}

module.exports = matchAttestations