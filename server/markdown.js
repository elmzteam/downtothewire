"use strict";

var markdownIt  = require("markdown-it")
var logger      = require("./logger")
var highlight   = require("highlight.js")

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
		<pre class="hljs"><code class=${escape((lang in LANGS ? LANGS[lang].toLowerCase() : lang), true)}>${code}</code></pre>
	</dttw-code>`;
}

var md = markdownIt({
	html: true,
	linkify: true,
	typographer: true,
	highlight: (code, description) => {
		try {
			let [lang, filename] = description.split("|")

			if (lang) {
				var {value: highlighted, language} = highlight.highlight(lang, code)
			} else {
				var {value: highlighted, language} =  highlight.highlightAuto(code).value
			}

			if (language === "bash") {
				highlighted = highlighted.replace(/(^|\n)\$/g, "$1<span class='hljs-prompt'>$</span>") // highlight the fake prompts
			}

			return formatCode(highlighted, language, filename)
		} catch (e) {
			logger.warn("Syntax highlighting failed:", e)
			return code
		}
	}
});

md.block.ruler.at("heading", (state, startLine, endLine, silent) => {
	var ch, level, tmp, token,
		pos = state.bMarks[startLine] + state.tShift[startLine],
		max = state.eMarks[startLine];

	ch  = state.src.charCodeAt(pos);

	if (ch !== 0x23/* # */ || pos >= max) { return false; }

	// count heading level
	level = 1;
	ch = state.src.charCodeAt(++pos);
	while (ch === 0x23/* # */ && pos < max && level <= 6) {
		level++;
		ch = state.src.charCodeAt(++pos);
	}

	if (level > 6 || (pos < max && ch !== 0x20/* space */)) { return false; }

	if (silent) { return true; }

	// Let's cut tails like '    ###  ' from the end of string

	max = state.skipSpacesBack(max, pos);
	tmp = state.skipCharsBack(max, 0x23, pos); // #
	if (tmp > pos && md.utils.isSpace(state.src.charCodeAt(tmp - 1))) {
		max = tmp;
	}

	state.line = startLine + 1;

	token        = state.push('heading', 'h' + String(level), 1);
	token.markup = '########'.slice(0, level);
	token.content = state.src.slice(pos, max).trim();
	token.map    = [ startLine, state.line ];

	if (token.content.charAt(0) == "{") {
		token.content = token.content.substring(1);
		[token.classname, ...token.content] = token.content.split("}");
		token.content = token.content.join("}");
	}

	return true;
});

md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
	var token = tokens[idx]
	var info = token.info ? md.utils.unescapeAll(token.info.trim()) : ''
	var langName = ''

	if (info) {
		langName = info.split(/\s+/g)[0]
	}

	// highlight function is now required, but output is not wrapped
	return options.highlight(token.content, langName) || escapeHtml(token.content)
}

md.renderer.rules.heading = (tokens, idx, options, env, slf) => {
	var token = tokens[idx]
	var aName = tokens[idx].content.toLowerCase().replace(/\s*/g, "-");
	return `<${token.tag} class=${token.classname}><a name=${aName}></a>${token.content}</${token.tag}>`
}

module.exports = md;