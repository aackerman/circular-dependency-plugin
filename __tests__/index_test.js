var webpack                  = require('webpack');
var assert                   = require('assert');
var sinon                    = require('sinon');
var path                     = require('path');
var MemoryFS                 = require("memory-fs");
var CircularDependencyPlugin = require('../index');

describe('circular dependency', () => {
  var sandbox;
  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('detects circular dependencies from a -> b -> c -> b', (done) => {
    var s = sandbox.stub(console, 'warn', console.warn);
    var fs = new MemoryFS();
    var c = webpack({
      entry: path.join(__dirname, 'deps/a.js'),
      output: { path: __dirname },
      plugins: [ new CircularDependencyPlugin() ]
    });

    c.outputFileSystem = fs;

    c.run(function(err, stats){
      if (err) {
        assert(false, err);
        done();
      } else {
        assert(s.getCall(0).args[0].match(/b\.js/));
        assert(s.getCall(0).args[1].match(/cyclical/));
        assert(s.getCall(1).args[0].match(/c\.js/));
        assert(s.getCall(1).args[1].match(/cyclical/));
        done();
      }
    });
  });

  it('detects circular dependencies from d -> e -> f -> g -> e', (done) => {
    var s = sandbox.stub(console, 'warn', console.warn);
    var fs = new MemoryFS();
    var c = webpack({
      entry: path.join(__dirname, 'deps/d.js'),
      output: { path: __dirname },
      plugins: [ new CircularDependencyPlugin() ]
    });

    c.outputFileSystem = fs;

    c.run(function(err, stats){
      if (err) {
        assert(false, err);
        done();
      } else {
        assert(s.getCall(0).args[0].match(/e\.js/));
        assert(s.getCall(0).args[1].match(/cyclical/));
        assert(s.getCall(1).args[0].match(/f\.js/));
        assert(s.getCall(1).args[1].match(/cyclical/));
        assert(s.getCall(2).args[0].match(/g\.js/));
        assert(s.getCall(2).args[1].match(/cyclical/));
        done();
      }
    });
  });

  it('can exclude cyclical deps from being output', (done) => {
    var s = sandbox.stub(console, 'warn', console.warn);
    var fs = new MemoryFS();
    var c = webpack({
      entry: path.join(__dirname, 'deps/d.js'),
      output: { path: __dirname },
      plugins: [
        new CircularDependencyPlugin({
          exclude: /f\.js/
        })
      ]
    });

    c.outputFileSystem = fs;

    c.run(function(err, stats){
      if (err) {
        assert(false, err);
        done();
      } else {
        assert(s.getCall(0).args[0].match(/e\.js/));
        assert(s.getCall(0).args[1].match(/cyclical/));
        assert(s.getCall(1).args[0].match(/g\.js/));
        assert(s.getCall(1).args[1].match(/cyclical/));
        done();
      }
    });
  });


  it(`can handle context modules that have an undefined resource h -> i -> a -> i`, (done) => {
    var s = sandbox.stub(console, 'warn', console.warn);
    var fs = new MemoryFS();
    var c = webpack({
      entry: path.join(__dirname, 'deps/h.js'),
      output: { path: __dirname },
      plugins: [
        new CircularDependencyPlugin()
      ]
    });

    c.outputFileSystem = fs;

    c.run(function(err, stats){
      if (err) {
        assert(false, err);
        done();
      } else {
        done();
      }
    });
  });
});
