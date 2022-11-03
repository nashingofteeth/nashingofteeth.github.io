<html>
<head>
<title>Media Player</title>
<link href="https://vjs.zencdn.net/4.12/video-js.css" rel="stylesheet">
<script src="https://vjs.zencdn.net/4.12/video.js"></script>
<link href="favicon.ico" rel="Shortcut Icon" />
<style>
::-webkit-scrollbar {
  width: 3px;
  height: 3px;
}
::-webkit-scrollbar-track {
  background-color: #000;
}
::-webkit-scrollbar-thumb {
  background-color: #111;
}
body {
	background: black;
	color: white;
	text-align: center;
	line-height: 25px;
}
h3 {
	margin-top: 15%;
}
#open {
	position: absolute;
	left: 25%;
	width: 50%;
	margin-bottom: 10px;
}
a {
	color: grey;
	text-decoration: none;
	font-weight: bold;
	margin-right: 15px;
}
a:hover {
	text-decoration: underline;
}
input[type=text] {
	background: #222;
	outline: 0;
	color: lightgrey;
	border: none;
	padding: 5px;
	width: 80%;
}
input[type=submit] {
	color:grey;
	border: none;
	border-left: 1px solid grey;
	background: #222;
	padding: 5px;
}
input[type=submit]:hover {
	color: lightgrey;
}
</style>
</head>

<body>
<?php
if (isset($_GET['u'])) {
  $u = $_GET['u'];
  echo "<video id='my_video_1' class='video-js vjs-default-skin' controls loop
   preload='auto' autoplay width='100%' height='100%' poster='my_video_poster.png'
   data-setup='{}'>
   <source src='$u' type='video/mp4'>
  </video><br>";
} else {
  echo "<h3>Media Player</h3>";
}
?>
<div id="open">
<form method="get">
<input type="text" name="u" placeholder="URL..."><input type="submit" value="Play">
</form>

Local:<br>
<?php
if (empty($_GET['d'])) {
    $dir = '../m';
} else {
    $dir = $_GET['d'];
}
$list = array();

if ($handle = opendir($dir)) {
    while (false !== ($entry = readdir($handle))) {
        if ($entry != "." && $entry != ".." && $entry != ".htaccess" && $entry != "books") {
	    array_push($list, "$entry");
        }
    }
    closedir($handle);
}

sort($list);
foreach($list as $value) {
    if (is_file($dir."/".$value)) {
        echo " <a href='?u=$dir/$value&d=$dir'>$value</a>";
    } else {
        echo " <a href='?d=$dir/$value'>$value(DIR)</a>";
    }
}
?>
</div>
</body>
</html>
