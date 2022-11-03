<?php
	exec("cd /var/www/html/matt/; touch notes.txt; echo '" . $_GET["n"] . "' >> notes.txt");
	header("Location: notes.txt");
?>
