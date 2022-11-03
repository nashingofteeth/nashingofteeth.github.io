<?php
if ($handle = opendir('.')) {
    while (false !== ($entry = readdir($handle))) {
        if ($entry != "." && $entry != "..") {
            echo "<li><a href='$entry'>$entry</a></li>\n";
        }
    }
    closedir($handle);
}
?>
