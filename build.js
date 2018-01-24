const fs = require("fs-extra")
const path = require("path")
const glob = require("glob-promise")
const reshape = require("reshape")
const standard = require("reshape-standard")
const yaml = require("js-yaml")
const promisify = require("node-promisify")
const sass = require("node-sass")
const autoprefixer = require("autoprefixer")
const cssnano = require("cssnano")
const postcss = require("postcss")
const slug = require("slug")

slug.defaults.mode = "pretty"
slug.defaults.modes["pretty"].lower = true

const clean = async () => {
  await fs.remove("build")
}

const projects = async () => {
  const data = await fs.readFile("data/projects.yml")
  return yaml.load(data)
}

const pages = async (context) => {
  const pages = await glob("pages/**/*.html")

  const tasks = pages.map(async (page) => {
    const id = path.basename(page, path.extname(page))
    const directory = path.relative("pages", path.dirname(page))
    const file = (id == "index") ? "index.html" : `${id}/index.html`
    const destination = path.join("build", path.join(directory, file))

    const locals = Object.assign({ id }, context)
    const input = await fs.readFile(page)
    const plugin = standard({ locals, parser: false, minify: true })
    const template = await reshape(plugin).process(input)

    await fs.ensureDir(path.dirname(destination))
    await fs.writeFile(destination, template.output())
  })

  await Promise.all(tasks)
}

const images = async () => {
  await fs.copy("images", "build/images")
}

const general = async () => {
  await fs.copy("general", "build")
}

const styles = async (production) => {
  const source = "styles/main.scss"
  const destination = "build/styles/main.css"
  const render = promisify(sass.render)
  const result = await render({ file: source, includePaths: ["styles"], outputStyle: "compressed" })
  const buildPath = path.join(process.cwd(), "build")
  const plugins = [autoprefixer(), cssnano({ preset: "advanced" })]
  const options = { from: source, to: destination }
  const optimised = await postcss(plugins).process(result.css, options)
  await fs.ensureDir(path.dirname(destination))
  await fs.writeFile(destination, optimised.css)
}

const build = async () => {
  console.time("build")
  await clean()
  const context = { projects: await projects(), slug }
  await pages(context)
  await images()
  await styles()
  await general()
  console.timeEnd("build")
}

if (module.parent) { module.exports = build }
else { build() }