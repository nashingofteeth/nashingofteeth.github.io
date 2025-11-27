function toggleNode(li, event) {
  // If the click was on a link, don't toggle
  if (event && event.target.tagName === "A") {
    return;
  }

  // Get the parent ul element to understand the nesting level
  const parentUl = li.parentElement;

  // Find all UL elements that are children of this node
  // They will be siblings that come after this li until we hit another li at the same level
  const childUls = [];
  let currentElement = li.nextElementSibling;

  while (currentElement) {
    if (currentElement.tagName === "LI") {
      // Found another LI at the same level, stop
      break;
    }
    if (currentElement.tagName === "UL") {
      childUls.push(currentElement);
    }
    currentElement = currentElement.nextElementSibling;
  }

  if (childUls.length > 0) {
    const isCollapsed = li.classList.contains("collapsed");
    if (isCollapsed) {
      childUls.forEach((ul) => ul.classList.remove("collapsed"));
      li.classList.remove("collapsed");
    } else {
      childUls.forEach((ul) => ul.classList.add("collapsed"));
      li.classList.add("collapsed");
    }
  }
}
