<?php
if (isset($_GET['v'])) {
$v = $_GET['v'];
}
else {
header( 'Location: http://ourcoolwebshow.org' ) ;
}
$episodes_top = file_get_contents('http://dl.dropbox.com/u/7984474/Our%20Cool%20Webshow/episodes_top.txt');
$episodes_middle = file_get_contents('http://dl.dropbox.com/u/7984474/Our%20Cool%20Webshow/episodes_middle.txt');
$episodes_middle2 = file_get_contents('http://dl.dropbox.com/u/7984474/Our%20Cool%20Webshow/episodes_middle2.txt');
$episodes_bottom = file_get_contents('http://dl.dropbox.com/u/7984474/Our%20Cool%20Webshow/episodes_bottom.txt');
echo $episodes_top;
echo $v;
echo $episodes_middle;
echo $v;
echo $episodes_middle2;
echo $v;
echo $episodes_bottom;
?>