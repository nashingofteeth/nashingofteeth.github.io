<html>
<head>
  <title>up some shit</title>
  <style>
  body {
  	
  }
  </style>
</head>
<body>

<form method="post" enctype="multipart/form-data">
<input type="file" name="file" id="file" value="select file" />
<br />
<input type="submit" name="submit" value="upload" />
</form>

<br/>

<?php
if ($handle = opendir('.')) {
    while (false !== ($entry = readdir($handle))) {
        if ($entry != "." && $entry != "..") {
            echo "<li><a href='$entry'>$entry</a></li>\n";
        }
    }
    closedir($handle);
}
if(isset($_FILES['file'])) {

  if ($_FILES["file"]["error"] > 0)
    {
    echo "Return Code: " . $_FILES["file"]["error"] . "<br />";
    }
  else
    {
    echo "Upload: " . $_FILES["file"]["name"] . "<br />";
    echo "Type: " . $_FILES["file"]["type"] . "<br />";
    echo "Size: " . ($_FILES["file"]["size"] / 1048576) . " Mb<br />";

    if (file_exists("./". $_FILES["file"]["name"]))
      {
      echo $_FILES["file"]["name"] . " already exists. ";
      }
    else
      {
      move_uploaded_file($_FILES["file"]["tmp_name"],
      "./". $_FILES["file"]["name"]);
      echo "Stored in: <a href='". $_FILES["file"]["name"] . "'>". $_FILES["file"]["name"] . "</a>";
      }
    }
}
?>

</body>
</html>
