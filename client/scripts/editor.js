var editor;
$(function() {
	editor = ace.edit("editor");
	editor.setTheme("ace/theme/monokai");
	editor.getSession().setMode("ace/mode/markdown");

	$("#submit").click(submit);
	$("#theme-switcher").click(function() {
		$("#post-container").toggleClass("dark");
		$("html").toggleClass("dark");
	})
});

var submit = function() {
	if (!confirm("Confirm upload")) return;
	var val = editor.getValue()
	var tags = $("#tags").val().split(" ")
	var title = $("#title").val()
	var XHR = new XMLHttpRequest()
	XHR.open("POST", "")
	XHR.setRequestHeader("Content-Type", "application/json")
	XHR.send(JSON.stringify({
		content: val,
		tags: tags,
		title: title
	}))
};
