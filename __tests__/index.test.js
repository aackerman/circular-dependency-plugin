let path                     = require('path')
let MemoryFS                 = require("memory-fs")
let CircularDependencyPlugin = require('../index')

let wrapRun = (run) => {
  return () => new Promise((resolve, reject) => {
    run((err, result) => {
      if (err) { return reject(err) }
      return resolve(result.toJson())
    })
  })
}

let versions = [{
  name: 'webpack',
  module: require('webpack'),
}, {
  name: 'webpack-next',
  module: require('webpack-next'),
}]

let getWarningMessage = (stats, index) => {
  return getStatsMessage(stats, index, 'warnings')
}

let getErrorsMessage = (stats, index) => {
  return getStatsMessage(stats, index, 'errors')
}

let getStatsMessage = (stats, index, type) => {
  if (stats[type][index] == null) {
    return null
  } else if (stats[type][index].message) {
    // handle webpack 5
    return stats[type][index].message
  } else {
    // handle webpack 4
    return stats[type][index]
  }
}

for (let version of versions) {
  let webpack = version.module

  describe(`circular dependency ${version.name}`, () => {
    it('detects circular dependencies from a -> b -> c -> b', async () => {
      let fs = new MemoryFS()
      let compiler = webpack({
        mode: 'development',
        entry: path.join(__dirname, 'deps/a.js'),
        output: { path: __dirname },
        plugins: [ new CircularDependencyPlugin() ]
      })
      compiler.outputFileSystem = fs

      let runAsync = wrapRun(compiler.run.bind(compiler))
      let stats = await runAsync()

      let msg0 = getWarningMessage(stats, 0)
      expect(msg0).toContain('__tests__/deps/b.js -> __tests__/deps/c.js -> __tests__/deps/b.js')
      expect(msg0).toMatch(/Circular/)
    })

    it('detects circular dependencies from d -> e -> f -> g -> e', async () => {
      let fs = new MemoryFS()
      let compiler = webpack({
        mode: 'development',
        entry: path.join(__dirname, 'deps/d.js'),
        output: { path: __dirname },
        plugins: [ new CircularDependencyPlugin() ]
      })
      compiler.outputFileSystem = fs

      let runAsync = wrapRun(compiler.run.bind(compiler))
      let stats = await runAsync()

      let msg0 = getWarningMessage(stats, 0)
      expect(msg0).toContain('__tests__/deps/e.js -> __tests__/deps/f.js -> __tests__/deps/g.js -> __tests__/deps/e.js')
      expect(msg0).toMatch(/Circular/)
    })

    it('uses errors instead of warnings with failOnError', async () => {
      let fs = new MemoryFS()
      let compiler = webpack({
        mode: 'development',
        entry: path.join(__dirname, 'deps/d.js'),
        output: { path: __dirname },
        plugins: [ new CircularDependencyPlugin({
          failOnError: true
        }) ]
      })
      compiler.outputFileSystem = fs

      let runAsync = wrapRun(compiler.run.bind(compiler))
      let stats = await runAsync()

      let err0 = getErrorsMessage(stats, 0)
      expect(err0).toContain('__tests__/deps/e.js -> __tests__/deps/f.js -> __tests__/deps/g.js -> __tests__/deps/e.js')
      expect(err0).toMatch(/Circular/)
    })

    it('can exclude cyclical deps from being output', async () => {
      let fs = new MemoryFS()
      let compiler = webpack({
        mode: 'development',
        entry: path.join(__dirname, 'deps/d.js'),
        output: { path: __dirname },
        plugins: [
          new CircularDependencyPlugin({
            exclude: /f\.js/
          })
        ]
      })
      compiler.outputFileSystem = fs

      let runAsync = wrapRun(compiler.run.bind(compiler))
      let stats = await runAsync()

      let msg0 = getWarningMessage(stats, 0)
      expect(msg0).toMatch(/Circular/)
    })

    it('includes all cyclical deps in the output even if some are excluded', async () => {
      let fs = new MemoryFS()
      let compiler = webpack({
        mode: 'development',
        entry: path.join(__dirname, 'deps/d.js'),
        output: { path: __dirname },
        plugins: [
          new CircularDependencyPlugin({
            include: /f\.js/
          })
        ]
      })
      compiler.outputFileSystem = fs

      let runAsync = wrapRun(compiler.run.bind(compiler))
      let stats = await runAsync()
      let msg0 = getWarningMessage(stats, 0)
      expect(msg0).toMatch(/Circular dependency detected:\s*__tests__\/deps\/e.js -> __tests__\/deps\/f.js -> __tests__\/deps\/g.js -> __tests__\/deps\/e.js/)
    })

    it('does not report errors for cycles where all files are excluded', async () => {
      let fs = new MemoryFS()
      let compiler = webpack({
        mode: 'development',
        entry: path.join(__dirname, 'deps/d.js'),
        output: { path: __dirname },
        plugins: [
          new CircularDependencyPlugin({
            exclude: /(e|f|g)\.js/
          })
        ]
      })
      compiler.outputFileSystem = fs

      let runAsync = wrapRun(compiler.run.bind(compiler))
      let stats = await runAsync()
      let msg0 = getWarningMessage(stats, 0)
      expect(msg0).toEqual(null)
    })

    it(`can handle context modules that have an undefined resource h -> i -> a -> i`, async () => {
      let fs = new MemoryFS()
      let compiler = webpack({
        mode: 'development',
        entry: path.join(__dirname, 'deps/h.js'),
        output: { path: __dirname },
        plugins: [
          new CircularDependencyPlugin()
        ]
      })
      compiler.outputFileSystem = fs

      let runAsync = wrapRun(compiler.run.bind(compiler))
      let stats = await runAsync()
      expect(stats.warnings.length).toEqual(0)
      expect(stats.errors.length).toEqual(0)
    })

    it('allows hooking into detection cycle', async () => {
      let fs = new MemoryFS()
      let compiler = webpack({
        mode: 'development',
        entry: path.join(__dirname, 'deps/nocycle.js'),
        output: { path: __dirname },
        plugins: [
          new CircularDependencyPlugin({
            onStart({ compilation }) {
              compilation.warnings.push('started');
            },
            onEnd({ compilation }) {
              compilation.errors.push('ended');
            }
          })
        ]
      })
      compiler.outputFileSystem = fs

      let runAsync = wrapRun(compiler.run.bind(compiler))
      let stats = await runAsync()

      if (/^5/.test(webpack.version)) {
        expect(stats.warnings).toEqual([{ message: 'started' }])
        expect(stats.errors).toEqual([{ message: 'ended' }])
      } else {
        expect(stats.warnings).toEqual(['started'])
        expect(stats.errors).toEqual(['ended'])
      }
    })


    it('allows overriding all behavior with onDetected', async () => {
      let cyclesPaths
      let fs = new MemoryFS()
      let compiler = webpack({
        mode: 'development',
        entry: path.join(__dirname, 'deps/d.js'),
        output: { path: __dirname },
        plugins: [
          new CircularDependencyPlugin({
            onDetected({ paths }) {
              cyclesPaths = paths
            }
          })
        ]
      })
      compiler.outputFileSystem = fs

      let runAsync = wrapRun(compiler.run.bind(compiler))
      await runAsync()
      expect(cyclesPaths).toEqual([
        '__tests__/deps/e.js',
        '__tests__/deps/f.js',
        '__tests__/deps/g.js',
        '__tests__/deps/e.js',
      ])
    })

    it('detects circular dependencies from d -> e -> f -> g -> e', async () => {
      let fs = new MemoryFS()
      let compiler = webpack({
        mode: 'development',
        entry: path.join(__dirname, 'deps/d.js'),
        output: { path: __dirname },
        plugins: [
          new CircularDependencyPlugin({
            onDetected({ paths, compilation }) {
              compilation.warnings.push(paths.join(' -> '))
            }
          })
        ]
      })
      compiler.outputFileSystem = fs

      let runAsync = wrapRun(compiler.run.bind(compiler))
      let stats = await runAsync()

      let msg0 = getWarningMessage(stats, 0)
      expect(msg0).toContain('__tests__/deps/e.js -> __tests__/deps/f.js -> __tests__/deps/g.js -> __tests__/deps/e.js')
    })

    it('can detect circular dependencies when the ModuleConcatenationPlugin is used', async () => {
      let fs = new MemoryFS()
      let compiler = webpack({
        mode: 'development',
        entry: path.join(__dirname, 'deps/module-concat-plugin-compat/index.js'),
        output: { path: __dirname },
        plugins: [
          new webpack.optimize.ModuleConcatenationPlugin(),
          new CircularDependencyPlugin()
        ]
      })
      compiler.outputFileSystem = fs

      let runAsync = wrapRun(compiler.run.bind(compiler))
      let stats = await runAsync()

      let msg0 = getWarningMessage(stats, 0)
      expect(msg0).toContain('__tests__/deps/module-concat-plugin-compat/a.js -> __tests__/deps/module-concat-plugin-compat/b.js -> __tests__/deps/module-concat-plugin-compat/a.js')
    })
  })
}

