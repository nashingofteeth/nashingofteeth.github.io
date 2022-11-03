setTimeout(function(){
	document.body.setAttribute("class", "loaded");
	document.body.style.height = "120vh";
	window.scrollTo(0, 0);
}, 500);
window.onscroll = function() {
	if (document.body.getAttribute("class") == "loaded") {
	  var page = window.location.pathname;
	  if (page == "/index" || page == "/") window.location = "about";
	  if (page == "/about") window.location = "projects";
	  if (page == "/projects") window.location = "index";
	  else return null;
	}
};
