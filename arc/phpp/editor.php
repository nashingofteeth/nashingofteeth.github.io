<html>
	<head>
		<title>PHPP</title>
		<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.7/jquery.js"></script>
		<script src="http://malsup.github.com/jquery.form.js"></script>
		<script>
			document.onkeydown = function(evt) { evt = evt || window.event;
				if (evt.ctrlKey && evt.keyCode == 83) {
					evt.preventDefault();
					document.getElementById('ta').value = editor.getValue();
					$("#f").ajaxSubmit({url: 'save.php', type: 'post'});
					window.parent.dynamicframe.location.reload();
				}
			};
		</script>
		<style type="text/css" media="screen">
			html,body { overflow: hidden; }
			::-webkit-scrollbar {
				width: 5px;
				height: 5px;
			}
			::-webkit-scrollbar-track {
				background-color: #272822;
			}
			::-webkit-scrollbar-thumb {
				background-color: #555;
				border-radius: 5px;
				padding-right: 50px;
			}
			#editor {
				position: absolute;
				top: 0;
				right: 0;
				bottom: 0;
				left: 0;
			}
		</style>
	</head>
	<body>
		<div id="editor"></div>
		<script src="http://ace.c9.io/build/src/ace.js" charset="utf-8"></script>
		<script>
			var editor = ace.edit("editor");
			editor.setTheme("ace/theme/monokai");
			editor.getSession().setMode("ace/mode/html");
			editor.focus();
		</script>
		<form style="display: none" id="f" method="POST">
			<textarea id="ta" name="ta"></textarea>
		</form>
	</body>
</html>
