let { isAcyclic, depthFirstIterator } = require('../is-acyclic');


function makeGraph(adjacencyList) {
  const vertices = adjacencyList.map((v) => v[0]);
  const arrow = (vertex) => {
    for (const adj of adjacencyList)
      if (adj[0] === vertex)
        return adj[1];
    throw new Error('invalid vertex: ' + vertex);
  }
  return {
    vertices,
    arrow,
  }
}


describe('makeGraph', () => {
  const graph = makeGraph([
    ['u', ['v', 'x']],
    ['v', ['y']],
    ['w', ['y', 'z']],
    ['x', ['v']],
    ['y', ['x']],
    ['z', ['z']],
  ]);

  it('constructs vertices', () => {
    expect(graph.vertices).toEqual(['u', 'v', 'w', 'x', 'y', 'z'])
  });

  it('constructs arrow function', () => {
    expect(graph.arrow('u')).toEqual(['v', 'x'])
    expect(graph.arrow('v')).toEqual(['y'])
    expect(graph.arrow('w')).toEqual(['y', 'z'])
    expect(graph.arrow('x')).toEqual(['v'])
    expect(graph.arrow('y')).toEqual(['x'])
    expect(graph.arrow('z')).toEqual(['z'])
  });
})


describe('depthFirstIterator', () => {

  const graph = makeGraph([
    ['u', ['v', 'x']],
    ['v', ['y']],
    ['w', ['y', 'z']],
    ['x', ['v']],
    ['y', ['x']],
    ['z', ['z']],
  ]);

  it('traverses all vertices', () => {
    vertices = new Set();
    depthFirstIterator(
      graph,
      (vertex, adjacent) => vertices.add(vertex),
      (u, v) => {},
    )
    expect(vertices).toEqual(new Set(graph.vertices));
  });

  it('follows this path', () => {
    const path = [];
    depthFirstIterator(
      graph,
      (vertex, adjacent) => path.push({ vertex, adjacent }),
      (u, v) => path.push({ backEdge: [u, v] }),
    )
    expect(path).toEqual([
      { vertex: 'u', adjacent: ['v', 'x'] },
      { vertex: 'v', adjacent: ['y'] },
      { vertex: 'y', adjacent: ['x'] },
      { vertex: 'x', adjacent: ['v'] },
      { backEdge: ['x', 'v'] },
      { vertex: 'w', adjacent: ['y', 'z'] },
      { vertex: 'z', adjacent: ['z'] },
      { backEdge: ['z', 'z'] },
    ]);
  });
});


describe('isAcyclic', () => {

  it('finds no cycle in tree', () => {
    // note: adjacent vertices are alphabetically higher => tree graph
    const graph = makeGraph([
      ['u', ['v', 'x']],
      ['v', ['y']],
      ['w', ['y', 'z']],
      ['x', []],
      ['y', []],
      ['z', []],
    ]);
    expect(isAcyclic(graph)).toBe(true);
  });

  it('finds cycle in complicated graph', () => {
    const graph = makeGraph([
      ['u', ['v', 'x']],
      ['v', ['y']],
      ['w', ['y', 'z']],
      ['x', ['v']],
      ['y', ['x']],
      ['z', ['z']],
    ]);
    expect(isAcyclic(graph)).toBe(false);
  });
});
