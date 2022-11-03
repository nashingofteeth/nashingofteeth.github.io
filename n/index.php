<?php
    if (isset($_POST['ta'])) {
    	$fileName = "s.html";
    	$fileHandle = fopen($fileName, 'w') or die("can't open file");
    	fwrite($fileHandle, $_POST['ta']);
    	fclose($fileHandle);
    	echo file_get_contents("s.html");
    }
?>
<html>
	<head>
		<title>Notepad</title>
		<meta name=viewport content='width=200'>
		<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7/jquery.js"></script>
		<script src="jquery.form.js"></script>
		<link rel='icon' href='favicon.ico' type='image/x-icon'/ >
        <link href='https://fonts.googleapis.com/css?family=Cutive+Mono' rel='stylesheet' type='text/css'>
	</head>
	<style>
		#d {
			overflow: hidden; 
			padding: 3vh; 
			outline: 0; 
			border: .05vw dashed lightgrey;
			font-size: 3vh;
			color: #333; 
			font-family: 'Cutive Mono', monospace;
			line-height: 7vh; 
			width: 80vw; 
			margin: 5vh auto auto auto;
			opacity: .6;
			transition: .5s ease-in-out;
		}
		#d:focus {
			opacity: 1;
		}
		a {
			color: #379b77;
			text-decoration: none;
		}
		a:hover {
			color: #157c77;
			cursor: pointer;
		}
		img {
			border-radius: .3vw;
			width: 40vh;
		}
		iframe {
			border: .1vw solid black;
			border-radius: 5px;
			height: 100%;
			width: 100%;
		}
		textarea {
			width: 100%;
			height: 200px;
		}
		#status {
			position: absolute;
			top: .5vw;
			left: .8vw;
			font-size: 1svw;
		}		  
	</style>
	<body>
		<pre id="status"></pre>
		<form id="f" method="POST">
			<div id="d" contenteditable spellcheck="false">
				<?php echo file_get_contents("s.html"); ?>
			</div>
			<input type="hidden" id="ta" name="ta"/>
		</form>

		<script>
			window.ononline = function() {
				document.offline = false; 
				localStorage.offline = false; 
				document.getElementById("status").innerHTML = "Online. Local changes have been uploaded."; 
				setTimeout(function() {document.getElementById('status').innerHTML = ''}, 5000)
			};
			window.onoffline = function() {
				document.offline = true; 
				document.getElementById("status").innerHTML = "Offline. All changes will be saved locally."
			};

			window.onload = function() {
				document.getElementById("d").focus();
				setInterval("save()", 100);
				if (localStorage.offline == "true") {
					document.getElementById("d").innerHTML = localStorage.notepad;
					localStorage.offline = false;
					document.getElementById("status").innerHTML = "Local data restored."; 
					setTimeout(function() {document.getElementById('status').innerHTML = ''}, 5000)

				}
			};

			// document.onkeyup = function() {
			// 	var text = document.getElementById("d").innerHTML;
   //              var url = text.match(/uu(.*?)uu/);
   //              var img = text.match(/ii(.*?)ii/);

   //              if (url != null || img != null) {
   //                  if (url == null) {
   //                      document.getElementById("d").innerHTML = text.replace(img[0], "<img src='" + img[1] + "'>");
   //                  }
   //                  else {
   //                      document.getElementById("d").innerHTML = text.replace(url[0], "<a href='" + url[1] + "' onclick='window.open(this.href);return false'>" + url[1] + "</a>");
   //                  }
   //              }
			// };
			document.onkeydown = function(evt) {
				evt = evt || window.event;
				if (evt.keyCode == 220) {
					var selection = window.getSelection().toString();
					var code = prompt("i for image,  u for url, f for frame", "");
					if (code != null && code != "") {
						if (code == "i") {
							if (selection == "") {
								var url = prompt("Image URL:", "http://");
								pasteHtmlAtCaret("<img src='" + url + "'/>");
							} else {
								pasteHtmlAtCaret("<img src='" + selection + "'/>");
							}
						} else if (code == "u") {
							var url = prompt("URL:", "http://");
							if (selection == "") {
								pasteHtmlAtCaret("<a href='" + url + "' onclick='window.open(this.href);return false'>" + url + "</a>");
							} else {
								if (url == "") {
									pasteHtmlAtCaret("<a href='" + selection + "' onclick='window.open(this.href);return false'>" + selection + "</a>");
								} else {
									pasteHtmlAtCaret("<a href='" + url + "' onclick='window.open(this.href);return false'>" + selection + "</a>");
								}
							}
						} else if (code == "f") {
							var code = prompt("HTML:","");
							if (code != null) {
								var data = code.replace(/["]/g,"&#34;");
								var data = code.replace(/[']/g,"&#39;");
								pasteHtmlAtCaret("<iframe srcdoc='" + data + "'></iframe");
							}
						} else {
							//document.getElementById("d").innerHTML = document.getElementById("d").innerHTML + code;
							pasteHtmlAtCaret(code);
						}
					} else {
						pasteHtmlAtCaret("<br>");
					}
					
					document.getElementById("d").innerHTML = document.getElementById("d").innerHTML.replace("\\", "");
				}
				if (evt.keyCode == 27) {
					evt.preventDefault();
					var r=confirm("Are you sure you would like to clear all data. Press OK to continue.");
					if (r===true) {
						document.getElementById("d").innerHTML="";
					}
				}
			};

			function save() {
				if (document.offline === true) {
					localStorage.notepad=document.getElementById("d").innerHTML;
					localStorage.offline = true;
				} else {
					document.getElementById("ta").value = document.getElementById("d").innerHTML;
					$("#f").ajaxSubmit();
				}
			}

document.addEventListener('paste', function (event) {
    event.preventDefault();
    var clip = event.clipboardData.getData('text/plain');
    var urlRegex =/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    var urlq = clip.match(urlRegex);
    var imgRegex =/(\b(https?|ftp|file):\/\/.*\.(?:jpg|jpeg|png|gif))/i;
    var imgq = clip.match(imgRegex);
    if (urlq != null && imgq != null) {
        var anchored = clip.replace(imgRegex, function(url) {
            return '<img src="' + url + '"/>';
        });
    }
    else if (urlq != null) {
        var anchored = clip.replace(urlRegex, function(url) {
            return '<a href="' + url +
                     '" style="cursor:pointer" onclick="window.open(this.href);return false">' +
                     url + '</a>';
        });
    }
    else var anchored = clip;
        
    document.execCommand('insertHTML', false, anchored);
});

			function pasteHtmlAtCaret(e){var t,n;if(window.getSelection){t=window.getSelection();if(t.getRangeAt&&t.rangeCount){n=t.getRangeAt(0);n.deleteContents();var r=document.createElement("div");r.innerHTML=e;var i=document.createDocumentFragment(),s,o;while(s=r.firstChild){o=i.appendChild(s)}n.insertNode(i);if(o){n=n.cloneRange();n.setStartAfter(o);n.collapse(true);t.removeAllRanges();t.addRange(n)}}}else if(document.selection&&document.selection.type!="Control"){document.selection.createRange().pasteHTML(e)}}
		</script>
	</body>
</html>
