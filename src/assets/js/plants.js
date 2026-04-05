// ---------------------------------------------------------------------------
// generatePlantList — shared renderer used at build time (Node.js) and at
// runtime by the search feature. Pure function: data in, HTML string out.
// ---------------------------------------------------------------------------
function generatePlantList(taxonomy, level) {
  if (level === undefined) level = 0;
  var html = "";
  var indent = "  ".repeat(level);

  for (var i = 0; i < taxonomy.length; i++) {
    var node = taxonomy[i];
    var totalChildren = node.children.length + node.otherFiles.length;
    var hasMultipleChildren = totalChildren > 1;

    // If exactly 1 child, check if that child has children (grandchildren exist)
    if (totalChildren === 1 && node.children.length === 1) {
      var singleChild = node.children[0];
      var grandchildrenCount = singleChild.children.length + singleChild.otherFiles.length;
      if (grandchildrenCount > 0) {
        hasMultipleChildren = true;
      }
    }

    // Generate content for this node
    var content = "";
    if (node.file) {
      var displayName = node.name;
      var aliasText = "";
      if (node.file.aliases && node.file.aliases.length > 0) {
        aliasText = " <span class=\"aliases\">(" + node.file.aliases.join(", ") + ")</span>";
      }
      if (node.file.wikipedia) {
        content = "<a href=\"" + node.file.wikipedia + "\" target=\"_blank\">" + displayName + "</a>" + aliasText;
      } else {
        content = displayName + aliasText;
      }
    } else {
      content = "<span class=\"muted\">" + node.name + "</span>";
    }

    // Create list item
    if (hasMultipleChildren) {
      html += indent + "<li class=\"has-children\" onclick=\"toggleNode(this, event)\">" + content + "</li>\n";
    } else {
      html += indent + "<li>" + content + "</li>\n";
    }

    // Add other files at this level
    if (node.otherFiles.length > 0) {
      html += indent + "<ul>\n";
      for (var j = 0; j < node.otherFiles.length; j++) {
        var file = node.otherFiles[j];
        var fileContent = "";
        var fileAliasText = "";
        if (file.aliases && file.aliases.length > 0) {
          fileAliasText = " <span class=\"aliases\">(" + file.aliases.join(", ") + ")</span>";
        }
        if (file.wikipedia) {
          fileContent = "<a href=\"" + file.wikipedia + "\" target=\"_blank\">" + file.fileName + "</a>" + fileAliasText;
        } else {
          fileContent = file.fileName + fileAliasText;
        }
        html += indent + "  <li>" + fileContent + "</li>\n";
      }
      html += indent + "</ul>\n";
    }

    // Add children
    if (node.children.length > 0) {
      html += indent + "<ul>\n";
      html += generatePlantList(node.children, level + 1);
      html += indent + "</ul>\n";
    }
  }

  return html;
}

// ---------------------------------------------------------------------------
// toggleNode — collapse / expand handler (onclick, no-JS degrades gracefully)
// ---------------------------------------------------------------------------
function toggleNode(li, event) {
  // If the click was on a link, don't toggle
  if (event && event.target.tagName === "A") {
    return;
  }

  var childUls = [];
  var currentElement = li.nextElementSibling;

  while (currentElement) {
    if (currentElement.tagName === "LI") {
      break;
    }
    if (currentElement.tagName === "UL") {
      childUls.push(currentElement);
    }
    currentElement = currentElement.nextElementSibling;
  }

  if (childUls.length > 0) {
    var isCollapsed = li.classList.contains("collapsed");
    if (isCollapsed) {
      childUls.forEach(function (ul) { ul.classList.remove("collapsed"); });
      li.classList.remove("collapsed");
    } else {
      childUls.forEach(function (ul) { ul.classList.add("collapsed"); });
      li.classList.add("collapsed");
    }
  }
}

// ---------------------------------------------------------------------------
// Search — progressive enhancement. Activates only when:
//   1. Running in a browser (document exists)
//   2. A #plant-search input exists in the DOM
//   3. /plants/plant-data.json fetches successfully
// If any condition fails, the static tree and toggleNode remain untouched.
// ---------------------------------------------------------------------------
(function () {
  if (typeof document === "undefined") return;
  var searchInput = document.getElementById("plant-search");
  if (!searchInput) return;

  var plantData = null;
  // searchIndex: flat array of { node, ancestors[] }
  // otherFileIndex: flat array of { file, parentNode, ancestors[] }
  var searchIndex = [];
  var otherFileIndex = [];

  // Build flat index with ancestor paths
  function buildIndex(nodes, ancestors) {
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var nodeAncestors = ancestors.slice();
      searchIndex.push({ node: node, ancestors: nodeAncestors });

      for (var j = 0; j < node.otherFiles.length; j++) {
        otherFileIndex.push({
          file: node.otherFiles[j],
          parentNode: node,
          ancestors: nodeAncestors,
        });
      }

      if (node.children.length > 0) {
        buildIndex(node.children, nodeAncestors.concat([node]));
      }
    }
  }

  // Test a single string value against the query
  function matches(value, q) {
    return value.toLowerCase().indexOf(q) !== -1;
  }

  // Test whether a node directly matches (name, file, or otherFiles)
  function nodeMatches(node, q) {
    if (matches(node.name, q)) return true;
    if (node.file) {
      if (matches(node.file.fileName, q)) return true;
      for (var i = 0; i < node.file.aliases.length; i++) {
        if (matches(node.file.aliases[i], q)) return true;
      }
    }
    for (var j = 0; j < node.otherFiles.length; j++) {
      var f = node.otherFiles[j];
      if (matches(f.fileName, q)) return true;
      for (var k = 0; k < f.aliases.length; k++) {
        if (matches(f.aliases[k], q)) return true;
      }
    }
    return false;
  }

  // Test whether a specific otherFile matches
  function otherFileMatches(file, q) {
    if (matches(file.fileName, q)) return true;
    for (var i = 0; i < file.aliases.length; i++) {
      if (matches(file.aliases[i], q)) return true;
    }
    return false;
  }

  // Run search: returns { matchSet, ancestorSet, matchedFileNames } or null
  function runSearch(query) {
    var q = query.toLowerCase().trim();
    if (!q) return null;

    var matchSet = [];
    var ancestorSet = [];
    var matchedFileNames = {};
    var seenNodes = {};
    var seenAncestors = {};

    // Check regular nodes
    for (var i = 0; i < searchIndex.length; i++) {
      var entry = searchIndex[i];
      if (nodeMatches(entry.node, q)) {
        var nodeId = searchIndex.indexOf(entry);
        if (!seenNodes[nodeId]) {
          seenNodes[nodeId] = true;
          matchSet.push(entry.node);
          for (var j = 0; j < entry.ancestors.length; j++) {
            var anc = entry.ancestors[j];
            if (!seenAncestors[anc.name + "_" + anc.file]) {
              seenAncestors[anc.name] = true;
              ancestorSet.push(anc);
            }
          }
        }
      }
    }

    // Check otherFiles — if one matches, track which file names matched
    for (var ii = 0; ii < otherFileIndex.length; ii++) {
      var oEntry = otherFileIndex[ii];
      if (otherFileMatches(oEntry.file, q)) {
        matchedFileNames[oEntry.file.fileName] = true;
        // If the parent node isn't already in matchSet, add it
        var alreadyMatched = false;
        for (var jj = 0; jj < matchSet.length; jj++) {
          if (matchSet[jj] === oEntry.parentNode) {
            alreadyMatched = true;
            break;
          }
        }
        if (!alreadyMatched) {
          matchSet.push(oEntry.parentNode);
          for (var kk = 0; kk < oEntry.ancestors.length; kk++) {
            var anc2 = oEntry.ancestors[kk];
            if (!seenAncestors[anc2.name]) {
              seenAncestors[anc2.name] = true;
              ancestorSet.push(anc2);
            }
          }
        }
      }
    }

    return { matchSet: matchSet, ancestorSet: ancestorSet, matchedFileNames: matchedFileNames };
  }

  // Build HTML for a single file (otherFile entry)
  function fileHtml(file, isHighlighted, matchedFileNames) {
    var aliasText = "";
    if (file.aliases && file.aliases.length > 0) {
      aliasText = " <span class=\"aliases\">(" + file.aliases.join(", ") + ")</span>";
    }
    var label = "";
    if (file.wikipedia) {
      label = "<a href=\"" + file.wikipedia + "\" target=\"_blank\">" + file.fileName + "</a>" + aliasText;
    } else {
      label = file.fileName + aliasText;
    }
    if (isHighlighted) {
      return "<li class=\"search-match\">" + label + "</li>\n";
    }
    return "<li>" + label + "</li>\n";
  }

  // Render a node label (without its children)
  function nodeLabelHtml(node, extraClass) {
    var cls = extraClass ? " class=\"" + extraClass + "\"" : "";
    var content = "";
    if (node.file) {
      var aliasText = "";
      if (node.file.aliases && node.file.aliases.length > 0) {
        aliasText = " <span class=\"aliases\">(" + node.file.aliases.join(", ") + ")</span>";
      }
      if (node.file.wikipedia) {
        content = "<a href=\"" + node.file.wikipedia + "\" target=\"_blank\">" + node.name + "</a>" + aliasText;
      } else {
        content = node.name + aliasText;
      }
    } else {
      content = "<span class=\"muted\">" + node.name + "</span>";
    }
    return "<li" + cls + ">" + content + "</li>\n";
  }

  // Render pruned (search result) tree — merged ancestor chains
  function renderPrunedTree(nodes, matchSet, ancestorSet, matchedFileNames) {
    var html = "";

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];

      var isMatch = matchSet.indexOf(node) !== -1;
      var isAncestor = ancestorSet.indexOf(node) !== -1;

      if (!isMatch && !isAncestor) continue;

      if (isMatch) {
        // Render as match node with all descendants fully expanded
        html += nodeLabelHtml(node, "search-match");

        var hasSubContent = node.otherFiles.length > 0 || node.children.length > 0;
        if (hasSubContent) {
          html += "<ul>\n";
          for (var j = 0; j < node.otherFiles.length; j++) {
            var isHighlighted = !!matchedFileNames[node.otherFiles[j].fileName];
            html += fileHtml(node.otherFiles[j], isHighlighted, matchedFileNames);
          }
          if (node.children.length > 0) {
            html += generatePlantList(node.children, 0);
          }
          html += "</ul>\n";
        }
      } else {
        // Ancestor-only node: render label, recurse into relevant children only
        html += nodeLabelHtml(node, "");

        // Only descend into children that are in matchSet or ancestorSet
        var relevantChildren = [];
        for (var k = 0; k < node.children.length; k++) {
          var child = node.children[k];
          if (matchSet.indexOf(child) !== -1 || ancestorSet.indexOf(child) !== -1) {
            relevantChildren.push(child);
          }
        }

        if (relevantChildren.length > 0) {
          html += "<ul>\n";
          html += renderPrunedTree(relevantChildren, matchSet, ancestorSet, matchedFileNames);
          html += "</ul>\n";
        }
      }
    }

    return html;
  }

  // Replace the tree contents and toggle search-active state on the container
  function renderTree(html, isSearch) {
    var treeEl = document.getElementById("plant-tree");
    var listEl = treeEl ? treeEl.closest(".plant-list") : null;
    if (!treeEl) return;
    treeEl.innerHTML = html;
    if (listEl) {
      if (isSearch) {
        listEl.setAttribute("data-search-active", "");
      } else {
        listEl.removeAttribute("data-search-active");
      }
    }
  }

  // Fetch JSON, build index, wire up search input
  fetch("/plants/plant-data.json")
    .then(function (res) {
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    })
    .then(function (data) {
      plantData = data;
      buildIndex(plantData.taxonomy, []);

      var debounceTimer = null;

      searchInput.addEventListener("input", function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          var query = searchInput.value;
          if (!query.trim()) {
            // Restore static tree
            renderTree(generatePlantList(plantData.taxonomy, 0), false);
          } else {
            var result = runSearch(query);
            if (!result || (result.matchSet.length === 0)) {
              renderTree("<li class=\"muted\">No results.</li>", true);
            } else {
              renderTree(renderPrunedTree(plantData.taxonomy, result.matchSet, result.ancestorSet, result.matchedFileNames), true);
            }
          }
        }, 250);
      });

      // Mark search as available
      searchInput.removeAttribute("disabled");
      searchInput.setAttribute("placeholder", "Search by name or alias\u2026");
    })
    .catch(function () {
      // Fetch failed — search input stays disabled, static tree is unchanged
    });
}());

// ---------------------------------------------------------------------------
// UMD guard — allows templates/plants.js to require() this file at build time
// ---------------------------------------------------------------------------
if (typeof module !== "undefined") {
  module.exports = { generatePlantList: generatePlantList };
}
