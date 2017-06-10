"use strict"
/* global $:false, ace:false, localforage: false */

let editor = null
let confirmedDelete = false

const submit = function() {
	const content = editor.getValue()
	const tags = $("#tags").val()
		.trim()
		.split(" ")
		.filter((tag) => !tag.match(/^\s*$/))

	const title = $("#title").val()

	let deleting = false

	if (content.match(/^\s*$/) && title.match(/^\s*$/) && tags.length === 0) {
		if (confirmedDelete) {
			deleting = true
		} else {
			confirmedDelete = true
			$("#status").text("Warning: this will delete this post from the server. Hit submit again to send.")
			return
		}
	}
	const visible = $("#visible").prop("checked")

	$("#status").text("Uploading...")

	const XHR = new XMLHttpRequest()
	XHR.open("POST", "")
	XHR.setRequestHeader("Content-Type", "application/json")

	XHR.onload = function() {
		setTimeout(function(that) {
			return function() {
				switch (that.status) {
					case 200: {
						$("#status").text("Update succesful.")
						const res = JSON.parse(that.responseText)
						if (res.id) {
							history.pushState({}, "Editor", `/editor/${res.id}`)
							$("#submit").text("Update")
						}
						if (deleting) {
							location.href = "/admin"
						}
						break
					}
					default:
						$("#status").text(`Error: ${that.responseText}`)
						break
				}
			}
		}(this), 200)
	}

	XHR.send(JSON.stringify({
		content: content,
		tags: tags,
		title: title,
		visible: visible
	}))
}

const visible = function() {
	const XHR = new XMLHttpRequest()
	XHR.open("POST", "/visible")
	XHR.setRequestHeader("Content-Type", "application/json")

	const el = $(this)
	XHR.onload = function() {
		const res = JSON.parse(XHR.response)
		el.removeClass("hidden")
		el.removeClass("visible")
		el.addClass(res.state)
		el.attr("visible", res.visible)
	}
	XHR.send(JSON.stringify({
		page: el.attr("post"),
		state: !JSON.parse(el.attr("visible"))
	}))
}

const attachHandles = function() {
	if ($("#editor").length > 0) {
		editor = ace.edit("editor")
		editor.setTheme("ace/theme/chrome")
		editor.getSession().setMode("ace/mode/markdown")
		editor.getSession().setUseWrapMode(true)
	}

	$("#submit").click(submit)
	$(".status-bar").click(visible)

	$("#theme-switcher").click(function() {
		localforage.setItem("useDarkTheme", $("html").toggleClass("dark").hasClass("dark"))

		if (editor !== null) {
			if (localforage.getItem("useDarkTheme")) {
				editor.setTheme("ace/theme/monokai")
			} else {
				editor.setTheme("ace/theme/chrome")
			}
		}
	})

	if (localforage.getItem("useDarkTheme")) {
		const $html = $("html")
		$html.addClass("force-no-animation")
		$("#theme-switcher").trigger("click")
		$html.removeClass("force-no-animation")
	}
	$(window).keydown(function(e) {
		if ((e.metaKey || e.ctrlKey) && e.keyCode === 83) { /*ctrl+s or command+s*/
			submit()
			e.preventDefault()
			return false
		}
	})

	$("#upload-trigger").click(function(e) {
		e.stopPropagation()
		const form = $("#file-upload")
		form.off("change")
		form.on("change", () => {
			const XHR = new XMLHttpRequest()
			XHR.open("POST", "/static/")
			const fData = new FormData(form[0].form)
			XHR.onload = function() {
				const out = JSON.parse(XHR.response)
				$(".upload-name")
					.removeClass("disabled")
					.text(out.path)
			}
			XHR.send(fData)
		})
		form.click()
	})

	$("#file-page-trigger").click(function(e) {
		e.stopPropagation()
		const form = $("#file-upload")
		form.off("change")
		form.on("change", () => {
			const XHR = new XMLHttpRequest()
			XHR.open("POST", "/static/")
			const fData = new FormData(form[0].form)
			XHR.onload = function() {
				let dummy = $(".file-item:first-child")[0].outerHTML
				const out = JSON.parse(XHR.response)
				dummy = dummy.replace(/\{\{path\}\}/g, out.path)
				dummy = dummy.replace(/\{\{file\}\}/g, out.file)
				dummy = dummy.replace(/\{\{short-file\}\}/g, out.shortFile)
				dummy = $(dummy)
				dummy.addClass("deleting")
				dummy.insertAfter(".file-item:first-child")
				setTimeout(() => {
					dummy.removeClass("deleting")
					$("#file-page-trigger").off()
					attachHandles()
				}, 200)
			}
			XHR.send(fData)
		})
		form.click()
	})

	$(".copy-path").click(function(e) {
		e.stopPropagation()
		const path = $(this).attr("path")
		const cb = $("#copy-buffer")
		cb.text(path)
		const range = document.createRange()
		range.selectNode(cb[0])
		window.getSelection().empty ? window.getSelection().empty() : undefined
		window.getSelection().removeAllRanges ? window.getSelection().removeAllRanges() : undefined
		window.getSelection().addRange(range)
		document.execCommand("copy")
		$(this).addClass("copied")
		$(this).outerWidth()
		$(this).removeClass("copied")
	})

	$(".delete-path").click(function(e) {
		e.stopPropagation()
		const obj = $(this)
		const isConfirming = obj.attr("confirming")
		if (isConfirming === "false") {
			obj.attr("confirming", true)
			obj.children().text("delete_forever")
			return
		}
		const path = obj.attr("path")

		const XHR = new XMLHttpRequest()
		XHR.open("DELETE", path)
		XHR.onload = function() {
			if (XHR.status === 200 && XHR.response && JSON.parse(XHR.response).success) {
				obj.parent().addClass("deleting")
				setTimeout(() => obj.parent().remove(), 500)
			}
		}
		XHR.send()
	})
}

$(attachHandles)
