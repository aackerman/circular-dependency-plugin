let webpack                  = require('webpack')
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

describe('circular dependency', () => {
  it('detects circular dependencies from a -> b -> c -> b', async () => {
    let fs = new MemoryFS()
    let compiler = webpack({
      entry: path.join(__dirname, 'deps/a.js'),
      output: { path: __dirname },
      plugins: [ new CircularDependencyPlugin() ]
    })
    compiler.outputFileSystem = fs

    let runAsync = wrapRun(compiler.run.bind(compiler))
    let stats = await runAsync()

    expect(stats.warnings[0]).toContain('__tests__/deps/b.js -> __tests__/deps/c.js -> __tests__/deps/b.js')
    expect(stats.warnings[0]).toMatch(/Circular/)
    expect(stats.warnings[1]).toMatch(/b\.js/)
    expect(stats.warnings[1]).toMatch(/c\.js/)
  })

  it('detects circular dependencies from d -> e -> f -> g -> e', async () => {
    let fs = new MemoryFS()
    let compiler = webpack({
      entry: path.join(__dirname, 'deps/d.js'),
      output: { path: __dirname },
      plugins: [ new CircularDependencyPlugin() ]
    })
    compiler.outputFileSystem = fs

    let runAsync = wrapRun(compiler.run.bind(compiler))
    let stats = await runAsync()

    expect(stats.warnings[0]).toContain('__tests__/deps/e.js -> __tests__/deps/f.js -> __tests__/deps/g.js -> __tests__/deps/e.js')
    expect(stats.warnings[0]).toMatch(/Circular/)
    expect(stats.warnings[1]).toMatch(/e\.js/)
    expect(stats.warnings[1]).toMatch(/f\.js/)
    expect(stats.warnings[1]).toMatch(/g\.js/)
  })

  it('uses errors instead of warnings with failOnError', async () => {
    let fs = new MemoryFS()
    let compiler = webpack({
      entry: path.join(__dirname, 'deps/d.js'),
      output: { path: __dirname },
      plugins: [ new CircularDependencyPlugin({
        failOnError: true
      }) ]
    })
    compiler.outputFileSystem = fs

    let runAsync = wrapRun(compiler.run.bind(compiler))
    let stats = await runAsync()

    expect(stats.errors[0]).toContain('__tests__/deps/e.js -> __tests__/deps/f.js -> __tests__/deps/g.js -> __tests__/deps/e.js')
    expect(stats.errors[0]).toMatch(/Circular/)
    expect(stats.errors[1]).toMatch(/e\.js/)
    expect(stats.errors[1]).toMatch(/f\.js/)
    expect(stats.errors[1]).toMatch(/g\.js/)
  })

  it('can exclude cyclical deps from being output', async () => {
    let fs = new MemoryFS()
    let compiler = webpack({
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

    expect(stats.warnings[0]).toMatch(/Circular/)
    expect(stats.warnings[1]).toMatch(/e\.js/)
    expect(stats.warnings[1]).toMatch(/g\.js/)
  })

  it(`can handle context modules that have an undefined resource h -> i -> a -> i`, async () => {
    let fs = new MemoryFS()
    let compiler = webpack({
      entry: path.join(__dirname, 'deps/h.js'),
      output: { path: __dirname },
      plugins: [
        new CircularDependencyPlugin()
      ]
    })
    compiler.outputFileSystem = fs

    let runAsync = wrapRun(compiler.run.bind(compiler))
    let stats = await runAsync()
  })

  it('allows overriding all behavior with onDetected', async () => {
    let cyclesPaths
    let fs = new MemoryFS()
    let compiler = webpack({
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
      '__tests__/deps/g.js',
      '__tests__/deps/e.js',
      '__tests__/deps/f.js',
      '__tests__/deps/g.js'
    ])
  })

  it('detects circular dependencies from d -> e -> f -> g -> e', async () => {
    let fs = new MemoryFS()
    let compiler = webpack({
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

    expect(stats.warnings[0]).toContain('__tests__/deps/e.js -> __tests__/deps/f.js -> __tests__/deps/g.js -> __tests__/deps/e.js')
    expect(stats.warnings[1]).toMatch(/e\.js/)
    expect(stats.warnings[1]).toMatch(/f\.js/)
    expect(stats.warnings[1]).toMatch(/g\.js/)
  })

  it('can detect circular dependencies when the ModuleConcatenationPlugin is used', async () => {
    let fs = new MemoryFS()
    let compiler = webpack({
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
    expect(stats.warnings[0]).toContain('__tests__/deps/module-concat-plugin-compat/a.js -> __tests__/deps/module-concat-plugin-compat/b.js -> __tests__/deps/module-concat-plugin-compat/a.js')
    expect(stats.warnings[1]).toContain('__tests__/deps/module-concat-plugin-compat/b.js -> __tests__/deps/module-concat-plugin-compat/a.js -> __tests__/deps/module-concat-plugin-compat/b.js')
  })
})
