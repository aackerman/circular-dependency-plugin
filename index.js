let path = require('path')
let extend = require('util')._extend
let BASE_ERROR = 'Circular dependency detected:\r\n'
let PluginTitle = 'CircularDependencyPlugin'

class CircularDependencyPlugin {
  constructor(options) {
    this.options = extend({
      exclude: new RegExp('$^'),
      include: new RegExp('.*'),
      failOnError: false,
      allowAsyncCycles: false,
      onDetected: false,
      cwd: process.cwd()
    }, options)
  }

  apply(compiler) {
    let plugin = this
    let cwd = this.options.cwd

    compiler.hooks.compilation.tap(PluginTitle, (compilation) => {
      compilation.hooks.optimizeModules.tap(PluginTitle, (modules) => {
        if (plugin.options.onStart) {
          plugin.options.onStart({ compilation });
        }

        const [vertices, arrow] = webpackDependencyGraph(compilation, modules, plugin, this.options);

        for (let module of vertices) {
          let maybeCyclicalPathsList = this.isCyclic(module, module, {}, arrow)
          if (maybeCyclicalPathsList) {
            // allow consumers to override all behavior with onDetected
            if (plugin.options.onDetected) {
              try {
                plugin.options.onDetected({
                  module: module,
                  paths: maybeCyclicalPathsList,
                  compilation: compilation
                })
              } catch(err) {
                compilation.errors.push(err)
              }
              continue
            }

            // mark warnings or errors on webpack compilation
            let error = new Error(BASE_ERROR.concat(maybeCyclicalPathsList.join(' -> ')))
            if (plugin.options.failOnError) {
              compilation.errors.push(error)
            } else {
              compilation.warnings.push(error)
            }
          }
        }
        if (plugin.options.onEnd) {
          plugin.options.onEnd({ compilation });
        }
      })
    })
  }

  isCyclic(initialModule, currentModule, seenModules, arrow) {
    let cwd = this.options.cwd

    // Add the current module to the seen modules cache
    seenModules[currentModule.debugId] = true

    // If the modules aren't associated to resources
    // it's not possible to display how they are cyclical
    if (!currentModule.resource || !initialModule.resource) {
      return false
    }

    // Iterate over the current modules dependencies
    for (let depModule of arrow(currentModule)) {
      if (depModule.debugId in seenModules) {
        if (depModule.debugId === initialModule.debugId) {
          // Initial module has a circular dependency
          return [
            path.relative(cwd, currentModule.resource),
            path.relative(cwd, depModule.resource)
          ]
        }
        // Found a cycle, but not for this module
        continue
      }

      let maybeCyclicalPathsList = this.isCyclic(initialModule, depModule, seenModules, arrow)
      if (maybeCyclicalPathsList) {
        maybeCyclicalPathsList.unshift(path.relative(cwd, currentModule.resource))
        return maybeCyclicalPathsList
      }
    }

    return false
  }
}


/**
 * Construct the dependency (directed) graph for the given plugin options
 *
 * Returns the graph as a pair [vertices, arrow] where 
 * - vertices is an array containing all vertices, and
 * - arrow is a function mapping vertices to the array of dependencies, that is, 
 *   the head vertex for each graph edge whose tail is the given vertex.
 */
function webpackDependencyGraph(compilation, modules, plugin, options) {

  // vertices of the dependency graph are the modules
  const vertices = modules.filter((module) =>
    module.resource != null &&
      !plugin.options.exclude.test(module.resource) &&
      plugin.options.include.test(module.resource)
  );

  // arrow function for the dependency graph
  const arrow = (module) => module.dependencies
        .filter((dependency) => {
          // ignore CommonJsSelfReferenceDependency
          if (dependency.constructor &&
              dependency.constructor.name === 'CommonJsSelfReferenceDependency') {
            return false;
          }
          // ignore dependencies that are resolved asynchronously
          if (options.allowAsyncCycles && dependency.weak) { return false }
          return true;
        })
        .map((dependency) => {
          // map webpack dependency to module
          if (compilation.moduleGraph) {
            // handle getting a module for webpack 5
            return compilation.moduleGraph.getModule(dependency)
          } else {
            // handle getting a module for webpack 4
            return dependency.module
          }
        })
        .filter((depModule) => {
          if (!depModule) { return false }
          // ignore dependencies that don't have an associated resource
          if (!depModule.resource) { return false }
          // the dependency was resolved to the current module due to how webpack internals
          // setup dependencies like CommonJsSelfReferenceDependency and ModuleDecoratorDependency
          if (module === depModule) {
            return false
          }
          return true;
        });

  return [vertices, arrow];
}

module.exports = CircularDependencyPlugin
