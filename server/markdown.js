/* global escapeHtml:false */
"use strict"

const markdownIt   = require("markdown-it")
const logger       = require("./logger")
const highlight    = require("highlight.js")

const mdiAnchor    = require("markdown-it-anchor")
const mdiAttrs     = require("markdown-it-attrs")
const mdiContainer = require("markdown-it-container")
const mdiMark      = require("markdown-it-mark")

const LANGS = {
	"js": "JavaScript",
	"ts": "TypeScript",
	"bash": "Bash",
	"json": "JSON"
}

function formatCode(code, lang, filename){
	return `<dttw-code>
		<header>
			<span class="lang">${escape((lang in LANGS ? LANGS[lang] : lang), true)}</span>
			<span class="copy">
				<dttw-icon class="material-icons">content_copy</dttw-icon>
			</span>
			<span class="filename">${filename || ""}</span>
		</header>
		<pre class="hljs"><code class=${
			escape((lang in LANGS ? LANGS[lang].toLowerCase() : lang), true)
		}>${code}</code></pre>
	</dttw-code>`
}

const md = markdownIt({
	html: true,
	linkify: true,
	typographer: true,
	highlight: (code, description) => {
		try {
			const [lang, filename] = description.split(/\|/)

			let highlighted, language
			try {
				({ value: highlighted, language } = highlight.highlight(lang, code))
			} catch(e) {
				({ value: highlighted, language } =  highlight.highlightAuto(code).value)

				if (highlighted === undefined) {
					[highlighted, language] = [code, lang]
				}
			}

			if (language === "bash") {
				// highlight the fake prompts
				highlighted = highlighted.replace(/(^|\n)\$/g, "$1<span class='hljs-prompt'>$</span>")
			}

			return formatCode(highlighted, language, filename)
		} catch (e) {
			logger.warn("Syntax highlighting failed:", e)
			return code
		}
	}
})

md.use(mdiAnchor)
md.use(mdiAttrs)
md.use(mdiContainer, "aside", {
	validate: (params) => params.trim() === "aside",
	render: (tokens, idx) => (
		tokens[idx].nesting === 1
		? "<aside><div class=\"border\">"
		: "</div></aside>"
	)
})
md.use(mdiMark)

md.renderer.rules.fence = (tokens, idx, options) => {
	const token = tokens[idx]
	const info = token.info ? md.utils.unescapeAll(token.info.trim()) : ""

	// highlight function is now required, but output is not wrapped
	return options.highlight(token.content, info) || escapeHtml(token.content)
}

md.renderer.rules.heading = (tokens, idx) => {
	const token = tokens[idx]
	const aName = tokens[idx].content.toLowerCase().replace(/\s*/g, "-")
	return `<${token.tag} class=${token.classname}><a name=${aName}></a>${token.content}</${token.tag}>`
}

module.exports = md
