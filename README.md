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
Trust is spread proportionally, so on each level of the tree that trusts N dependencies, each gets a 1/N fraction of trust of the parent.
This is a simplistic version of the trust graph that doesn’t have a centralized trust computation possibility but is also easily immune to sybil attacks. If we wanted a global trust score and a non-subjective view into the trust graph, it’d need EigenTrust algorithm and a more sophisticated structure that’d be harder to host. I don't see a need to go beyond subjective views into the trust graph and building a global trust score can easily be added later.

### Assertions

The participant in trust graph points to a file or endpoint containing their assertions.

Each participant can make assertions/claims about packages, their vulnerabilities or other assertions. Attesttations can endorse and dispute an opinion on a subject.

Endpoints can be queried to return assertions about a subject. That enables organizations with large databases of vulnerability information to publish their assertions and have them be consumed by the trust graph without having to host a gigabyte JSON file.

## Implementation

### Hosting

#### Hosted on NPM

Each user publishes a `@username/i_trust` package with dependencies on other `@username/i_trust` packages
Your project has a ./trust/package.json that points to who you trust.

Being able to npm install a trust graph is a fun idea. I wonder how far we can push that. Arbitrary depth might not make sense because 20 levels deep the impact of assertions might become negligible. The 6 degree of separation theory says we might end up installing everything if we go 7 levels deep, but this is not a regular social network, so maybe it doesn't expand that much. It's a risk tho.

#### Hosted on GitHub

Each participant in the graph has a `_trust` repository with a `trust.json` file that lists who they trust. Everyone is identified by their github username and while it's not possible to npm-install a trust graph, fetching it from github through raw.githubusercontent should not be problematic either (citation needed).

More custom behavior (like a limit for depth) can be introduced if we're not piggybacking off of package installation.
Storage is more sustainable, because each update to trust and assertions does not need to be a separate tarball, but just a diff.

With the right mix of github repos and package.json files in them it could be possible to have a trust graph that can be npm-installed from git repositories, but it'd likely be more error prone and not immune to other problems of the npm hosting approach.

### Applying information from your trust graph to `npm audit` results

- `npm audit` output gets translated into assertions.
- For each assertion, matching assertions are found in the trust graph.
- assertions found are weighted with the trust from the trust graph and their dispute/endorse claims totalled into a score.

At this point the tool can either skip showing vulnerabilities that were disputed by the user's trust graph or provide context of the disputes and endorsements in the community.
