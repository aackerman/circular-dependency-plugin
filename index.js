let path = require('path')
let extend = require('util')._extend
let Graph = require('tarjan-graph')
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
        const dependencyGraph = new Graph()
        //console.log('LENGTH', modules.length);
        for (let module of modules) {

          // Iterate over the current modules dependencies
          const dependedModuleIds = [];
          for (let dependency of module.dependencies) {
            let depModule = null
            if (compilation.moduleGraph) {
              // handle getting a module for webpack 5
              depModule = compilation.moduleGraph.getModule(dependency)
            } else {
              // handle getting a module for webpack 4
              depModule = dependency.module
            }

            if (!depModule) { continue }

            // ignore dependencies that don't have an associated resource
            if (!depModule.resource) { continue }

            // optionally ignore dependencies that are resolved asynchronously
            if (this.options.allowAsyncCycles && dependency.weak) { continue }

            dependedModuleIds.push(depModule.identifier());
          }
          dependencyGraph.add(module.identifier(), dependedModuleIds)
        }

        const cycles = dependencyGraph.getCycles();

        cycles.forEach((vertices) => {
          // Convert the array of vertices into an array of module paths
          const cyclicPaths = vertices
            .slice()
            .reverse()
            .map((vertex) => compilation.findModule(vertex.name).resource)
            .filter((resource) => !(
              resource == null ||
              plugin.options.exclude.test(resource) ||
              !plugin.options.include.test(resource)
            ))
            .map((resource) => path.relative(cwd, resource));

          // allow consumers to override all behavior with onDetected
          if (plugin.options.onDetected) {
            try {
              plugin.options.onDetected({
                module: module,
                paths: cyclicPaths.concat([cyclicPaths[0]]),
                compilation: compilation
              })
            } catch(err) {
              compilation.errors.push(err)
            }
            return
          }

          // mark warnings or errors on webpack compilation
          let error = new Error(BASE_ERROR.concat(cyclicPaths.concat([cyclicPaths[0]]).join(' -> ')))
          if (plugin.options.failOnError) {
            compilation.errors.push(error)
          } else {
            compilation.warnings.push(error)
          }
        });
        if (plugin.options.onEnd) {
          plugin.options.onEnd({ compilation });
        }
      })
    })
  }
}

module.exports = CircularDependencyPlugin
