$(document).ready(function () {
  fixSearch();
});

function fixSearch() {
  var target = document.getElementById('rtd-search-form');
  var config = {attributes: true, childList: true};

  var observer = new MutationObserver(function(mutations) {
    // if it isn't disconnected it'll loop infinitely because the observed element is modified
    observer.disconnect();
    var form = $('#rtd-search-form');
    form.empty();
    form.attr('action', 'http://' + window.location.hostname + '/en/' + determineSelectedBranch() + '/search.html');
    $('<input>').attr({
      type: "text",
      name: "q",
      placeholder: "Search docs"
    }).appendTo(form);
  });
  
  observer.observe(target, config);
}

/**
 * Analyzes the URL of the current page to find out what the selected GitHub branch is. It's usually
 * part of the location path. The code needs to distinguish between running MkDocs standalone
 * and docs served from RTD. If no valid branch could be determined 'dev' returned.
 *
 * @returns GitHub branch name
 */
function determineSelectedBranch() {
  var branch = 'stable', path = window.location.pathname;
  // path is like /en/<branch>/<lang>/build/ -> extract 'lang'
  // split[0] is an '' because the path starts with the separator
  branch = path.split('/')[2];
  return branch;
}