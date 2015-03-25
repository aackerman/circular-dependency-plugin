function CircularDependencyPlugin() {}

function isCyclic(id, dependencies) {
  var seen = [];

  function detect(deps) {
    for (var i in deps) {
      if (deps[i].module) {
        // if we have seen the module before we are definitely cycling
        if (seen.indexOf(deps[i].module.id) > -1) {
          return true;
        }

        seen.push(deps[i].module.id);

        // if the module is ourselves we are definitely cycling
        if (detect(deps[i].module.dependencies) && seen.indexOf(id) > -1) {
          return true;
        }
      }
    }
    return false;
  }

  return detect(dependencies);
}

CircularDependencyPlugin.prototype.apply = function(compiler) {
  compiler.plugin('done', function(c){
    var modules = c.compilation.modules;

    modules.forEach(function(module, idx){
      console.log(isCyclic(module.id, module.dependencies), 'module id', module.id);
    });
  });
}

module.exports = CircularDependencyPlugin;
