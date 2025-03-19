# trust graph playground

`npm start` runs the local verdaccio

`npm run generate` generates a trust graph from the structure.json file and publishes it to the local registry. 
You can see the graph diagram in [structure.md](./structure.md)

The graph can be installed and fiddled with in the `./testenv` folder

When the trust computer was run on the graph, the trust scores were computed and saved in [computed_trust.md](./testenv/computed_trust.md)

> NOTE: dotted lines with X represent self-trust that was ignored in the computation.
