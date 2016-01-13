var editor;

$(function() {
	editor = ace.edit("editor")
	editor.setTheme("ace/theme/chrome")
	editor.getSession().setMode("ace/mode/markdown")

	$("#submit").click(submit)

	$("#theme-switcher").click(function() {
		if($("html").toggleClass("dark").hasClass("dark")){
			editor.setTheme("ace/theme/monokai")
		} else {
			editor.setTheme("ace/theme/chrome")
		}
	})
});

var submit = function() {
	if(!confirm("Are you sure?")){
		return
	}

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
