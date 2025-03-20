# NPM trust graph

A way to create a distributed network of trust on which opinions (assertions) can be shared and consumed.

# Stuff to see here

graph-example has tools to set up a local registry with a trust graph in it.
graph-example/testenv is where we can fiddle with it

going to graph-example/testenv you can npm install the trust graph and run `node ../../trust-computer` on it

# Concepts and notes

## Entities

### Social graph of trust

Each participant points to other participants they trust.
This trust graph is deliberately minimalistic in terms of features. There's no manual way to give different scores to peers.
Trust is spread proportionally, so on each level of the tree that trusts N dependencies, each gets a 1/N fraction of trust of the parent.
This is a simplistic version of the trust graph that doesn’t have a centralized trust computation possibility but is also easily immune to sybil attacks and other attempts to overwhelm with fake accounts.

If we wanted a global trust score and a non-subjective view into the trust graph, it’d need EigenTrust algorithm and a more sophisticated structure that’d be harder to host. I don't see a need to go beyond subjective views into the trust graph and building a global trust score can easily be added later.

### Assertions

The participant in trust graph points to a file or endpoint containing their assertions.

Each participant can make assertions about packages, their vulnerabilities or other assertions. Assertions can endorse or dispute an opinion on a subject.

The basic way to host assertions is to have a JSON file with an array of assertions in a git repository and point to it from the node in the trust graph.

Each assertion has a subject, a claim and a trust score. The trust score is a number between 0 and 1 that represents how much the participant trusts the assertion. It gets derived from the trust graph of the user making the computation (scores and how they trickle down are explained above)
The trust score is used to weigh the assertion when it's being consumed by others.
The claim is either an endorsement (+1) or a dispute (-1) of facts represented by the subject.

The way `subject` is designed it can be used to represent the information we'd like to make a claim about but the same `subject` structure can be used as a query to match other assertions on the same/overlaping subject.

Endpoints can be queried to return assertions about a subject. That enables organizations with large databases of vulnerability information to publish their assertions and have them be consumed by the trust graph without having to host a gigabyte JSON file that could overwhelm client apps.

## What's missing

- weights to represent how much you trust the peers listed
- a way to assert opinions about other humans (not what I want to encourage, but could be added)
  - a dispute claim with subject containing only the `assertion.issuer` field could be considered a negative opinion about all assertions by an issuer if that's needed for countering bad actors.

# Implementation

### Hosting

#### Trust Graph is hosted on NPM

Each user publishes a `@username/i_trust` package with dependencies on other `@username/i_trust` packages
End user can depend on any of the trust packages and get the trust graph installed.
Only production dependencies are taken into account. That leaves room for distinction between:

- dependencies - I endorse these i_trust packages for my users to trust proportionally to the trust they have in my package
- devDependencies - I trust these i_trust packages for my own development but I don't want my users to trust them

> Packages in dependencies could also depend on trust packages, but as of the current implementation, transitive dependencies on i_trust packages are only reachable with the trust computer if the path leading to them only consists of i_trust packages. This is a limitation of the current implementation and could be lifted but I'm concerned with how it'd affect the trust on explicitly stated items. I might address it with trust computer configuration options.

> Being able to npm install a trust graph is a fun idea. I wonder how far we can push that. Arbitrary depth might not make sense because 20 levels deep the impact of assertions might become negligible. The 6 degree of separation theory says we might end up installing everything if we go 7 levels deep, but this is not a regular social network, so maybe it doesn't expand that much. It's a risk tho.

#### Assertions are hosted on GitHub or other endpoints

`package.json` in the `@username/i_trust` has a field named `assertions` that points to a file or endpoint with assertions. The basic way to host assertions is to have a JSON file with an array of assertions in a git repository and have assertions field point to it:

```
  "assertions":{"url":"https://raw.githubusercontent.com/naugtur/i_trust/assertions.json"},
 "dependencies": {
    "@someone/i_trust": "latest"
  },
```

### Applying information from your trust graph to `npm audit` results

- `npm audit` output gets translated into assertions.
- For each assertion, matching assertions are found in the trust graph.
- assertions found are weighted with the trust from the trust graph and their dispute/endorse claims totalled into a score.

At this point the tool can either skip showing vulnerabilities that were disputed by the user's trust graph or provide context of the disputes and endorsements in the community.
