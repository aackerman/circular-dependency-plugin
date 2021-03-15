

/**
 * Test whether a directed graph is acyclic
 *
 * The graph is represented as a object { vertices, arrow } where
 * - vertices is an array containing all vertices, and
 * - arrow is a function mapping a tail vertex to the array of head vertices, that is,
 *   the vertices at the head of each graph edge whose tail is the given vertex.
 *
 * For example:
 *
 *       x <- y <- z
 *
 * vertices == [x, y, z]    (order does not matter)
 * arrow(x) == []
 * arrow(y) == [x]
 * arrow(z) == [y]
 *
 * See https://stackoverflow.com/questions/261573/best-algorithm-for-detecting-cycles-in-a-directed-graph
 */
function isAcyclic(graph) {
  let isAcyclic = true;
  depthFirstIterator(
    graph,
    () => {},
    (backEdge) => isAcyclic = false);
  return isAcyclic;
}


/**
 * Depth-first traversal of the graph
 *
 * The visitor function is called with vertex, adjacent vertices
 * The backEdge function is called with head, tail of a back edge
 */
function depthFirstIterator(graph, visitorFn, backEdgeFn) {
  const discovered = new Set();
  const finished = new Set();
  for (const vertex of graph.vertices) {
    if (!(discovered.has(vertex) || finished.has(vertex)))
      depthFirstVisitor(vertex, discovered, finished, graph, visitorFn, backEdgeFn)
  }
}


function depthFirstVisitor(vertex, discovered, finished, graph, visitorFn, backEdgeFn) {
  discovered.add(vertex)
  const adjacent = graph.arrow(vertex);  // the adjacent vertices in the direction of the edges
  visitorFn(vertex, adjacent);

  for (const v of adjacent) {
    if (discovered.has(v)) {
      backEdgeFn(vertex, v);
    } else {
      if (!finished.has(v))
        depthFirstVisitor(v, discovered, finished, graph, visitorFn, backEdgeFn)
    }
  }
  discovered.delete(vertex)
  finished.add(vertex)
}


module.exports = {
  isAcyclic,
  depthFirstIterator,
}
