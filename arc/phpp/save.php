<?php
    $fileName = "testFile.php";
    $fileHandle = fopen($fileName, 'w') or die("can't open file");
    fwrite($fileHandle, $_POST['ta']);
    fclose($fileHandle);
?>
