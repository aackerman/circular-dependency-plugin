var path = require('path');
var extend = require('util')._extend;

function CircularDependencyPlugin(options) {
  this.options = extend({
    exclude: new RegExp('$^'),
    outputFormat: 'full',
    failOnError: false
  }, options);
}

function isCyclic(initialModule, currentModule, seenModules) {
  seenModules[currentModule.id] = {};

  if (!currentModule.resource || !initialModule.resource) {
    return false;
  }

  for (var i in currentModule.dependencies) {
    var dep = currentModule.dependencies[i].module;

    if (!dep) {
      continue;
    }

    if (dep.id in seenModules) {
      if (dep.id === initialModule.id) {
        // Initial module has circ dep
        return [path.relative(process.cwd(), currentModule.resource), path.relative(process.cwd(), dep.resource)];
      }
      // Found a cycle, but not for this module
      continue;
    }
    var cyclePath = isCyclic(initialModule, dep, seenModules);
    if (cyclePath) {
      cyclePath.unshift(path.relative(process.cwd(), currentModule.resource));
      return cyclePath;
    }
  }
  return null;
}

CircularDependencyPlugin.prototype.apply = function(compiler) {
  var plugin = this;

  compiler.plugin('done', function(stats){
    var output = plugin.options.failOnError ? stats.compilation.errors : stats.compilation.warnings;
    var modules = stats.compilation.modules;
    var circularDependencies = [];

    modules.forEach(function(module){
      if (module.resource === undefined || plugin.options.exclude.test(module.resource)) { return; }
      var cyclePath = isCyclic(module, module, {});
      if (cyclePath) {
        circularDependencies.push(cyclePath);
      }
    });

    if (plugin.options.outputFormat === 'summary') {
      if (circularDependencies.length) {
        output.push(new Error(circularDependencies.length + ' circular '
          + ((circularDependencies.length === 1) ? 'dependency' : 'dependencies')
          + ' detected.'));
      }
    } else {
      circularDependencies.forEach(function(cyclePath) {
        output.push(new Error('Circular dependency detected:\r\n'.concat(cyclePath.join(' -> '))));
      });
    }
  });
}

module.exports = CircularDependencyPlugin;
