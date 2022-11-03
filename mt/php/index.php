<html>
<title>Metric Clock</title>
<link rel="apple-touch-icon" href="apple-touch-icon.png"/>
<link href='http://fonts.googleapis.com/css?family=Crimson+Text' rel='stylesheet' type='text/css'>
<style>
        body {
                margin-top: 20vh;
		font-family: 'Crimson Text', serif;
                text-align: center;
        }
	#content {
		border: 1vmin solid black;
		width: 65vmin;
		margin: auto;
		line-height: 15vh;
		padding: 10vmin 10vmin 8vmin 10vmin;
	}
        span {
		font-size: 25vmin;
        }
	a {
		font-size: 12vmin;
		color: black;
		text-decoration: none;
	}
</style>
<script language="javascript" type="text/javascript">
<!--
//Browser Support Code
ajaxFunction();
setInterval("ajaxFunction()", 1000);
function ajaxFunction(){
	var ajaxRequest;

	try{
		// Opera 8.0+, Firefox, Safari
		ajaxRequest = new XMLHttpRequest();
	} catch (e){
		// Internet Explorer Browsers
		try{
			ajaxRequest = new ActiveXObject("Msxml2.XMLHTTP");
		} catch (e) {
			try{
				ajaxRequest = new ActiveXObject("Microsoft.XMLHTTP");
			} catch (e){
				alert("Your browser broke!");
				return false;
			}
		}
	}

	ajaxRequest.onreadystatechange = function(){
		if(ajaxRequest.readyState == 4){
			document.querySelector('span').innerHTML = ajaxRequest.responseText;
		}
	}
	ajaxRequest.open("GET", "convert.php", true);
	ajaxRequest.send(null); 
}

//-->
</script>
<body>
	<div id="content">
		<span></span>
		<br>
		<a href="http://blog.yef.im/post/55681508772/metric-time">myriaseconds</a>
	</div>	
</body>
</html>
