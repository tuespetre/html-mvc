// This also does some stuff with form submitting elements
(function extendHyperlinkNavigation() {
  window.addEventListener('click', function (e) {
    if (!('pushState' in history)) return;

    var target = e.target,
        name = target.tagName,
        currentView;

    // Handle navigation-causing clicks
    if (name === 'A' || name === 'AREA') {
      e.preventDefault();      
      transition(
        target.href,
        target.title,
        target.view,
        target.model,
        'GET',
        function(req) {
          req.send();
        });
    }
    // Handle submission-causing clicks
    else if (
      (name === 'INPUT' && (target.type === 'submit' || target.type === 'image')) ||
      (name === 'BUTTON' && (target.type === 'submit'))
    ) {
      if (!target.form) return;
      target.form.__triggeringElement = target;
    }
  });
})();

(function extendFormSubmission() {

  window.addEventListener('submit', function (e) {
    if (!('pushState' in history)) return;

    var target = e.target,
        name = target.tagName,
        currentView;

    if (name === 'FORM') {
      var submitter = target.__triggeringElement,
          view = submitter ? submitter.formview || target.view : target.view,
          model = submitter ? submitter.formmodel || target.model : target.model,
          action = (submitter ? submitter.formaction || target.action : target.action) || window.location.href,
          enctype = submitter ? submitter.formenctype || target.enctype : target.enctype,
          _target = submitter ? submitter.formtarget || target.target : target.target,
          method = submitter ? submitter.formmethod || target.method : target.method;

      if (!view || (_target && _target !== '_self')) return;
      
      var sendRequest = function(req) {
        var data = new FormData(target);
        if (submitter) {
          data.append(submitter.name, submitter.value);
        }
        req.send(data);
      }
      
      if (method === 'get') {
        var data = constructFormDataSet(target, submitter);
        action = new URL(action);
        action.search = urlEncodeFormDataSet(data);
        sendRequest = function(req) { 
          req.send(); 
        };
      }
      
      e.preventDefault();
      transition(
        action,
        null,
        view,
        model,
        method,
        sendRequest);
    }
  });
  
})();

(function extendHistoryTraversal() {
  window.addEventListener('popstate', function (e) {
    var state = e.state;

    if (state && state.__fromMvc === true) {
      var targetView = state.targetView,
          currentView = document.currentView,
          restructured = document.mvc.restructureView(targetView);

      if (!restructured || !currentView) {
        location.replace(location.href);
        return;
      }
      else {
        document.title = state.title;
        document.mvc.transitionView(restructured, currentView);
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  });
})();