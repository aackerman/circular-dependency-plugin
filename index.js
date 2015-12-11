var path = require('path');
var extend = require('util')._extend;

function CircularDependencyPlugin(options) {
  this.options = extend({
    exclude: new RegExp('$^')
  }, options);
}

function isCyclic(initialModule) {
  var seen = {};

  function detect(parent, deps) {
    var mod;

    for (var i in deps) {
      if (deps[i].module) {
        mod = deps[i].module;
        // if we have seen the module before we are definitely cycling
        if (mod.id in seen) { return true; }
        seen[mod.id] = {};
        // if the module is ourselves we are definitely cycling
        if (detect(mod, mod.dependencies) && initialModule.id in seen) {
          return true;
        }
      }
    }
    return false;
  }

  return detect(initialModule, initialModule.dependencies);
}

CircularDependencyPlugin.prototype.apply = function(compiler) {
  var plugin = this;

  compiler.plugin('done', function(stats){
    var modules = stats.compilation.modules;

    modules.forEach(function(module){
      if (isCyclic(module) && !plugin.options.exclude.test(module.resource)) {
        var relativePathToModule = path.relative(process.cwd(), module.resource);
        console.warn(relativePathToModule, 'contains cyclical dependency');
      }
    });
  });
}

module.exports = CircularDependencyPlugin;
