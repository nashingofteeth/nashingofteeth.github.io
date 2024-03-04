<?php
	date_default_timezone_set('America/Los_Angeles');
	$n_hr = date('H');
	$n_min = date('i');
	$sec = date('s');
	$hr = $n_hr * 3600;
	$min = $n_min * 60;
	$add = $hr+$min+$sec;
	$total = $add * pow(10, -4);
	$format = number_format($total, 4);
	echo $format;
?>
