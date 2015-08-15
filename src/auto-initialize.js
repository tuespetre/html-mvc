document.addEventListener('DOMContentLoaded', function () {
  
  var instance = document.mvc;
  
  // Register any declared models
  (function modelRegistration() {
    var models = document.querySelectorAll('script[type="application/json"][model]');
    for (var i = 0; i < models.length; i++) {
      var script = models[i];
      var name = script.model;
      if (name) {
        try {
          var result = JSON.parse(script.textContent);
          instance.defineModel(name, true);
          var model = instance.getModel(name);
          model.initialize(result);
        } catch (err) { }
      }
    }
  })();

  // Find existing current view, if any, and destructure/cache it
  (function viewCaching() {
    var currentView = document.currentView;
    if (!currentView) return;
    var name = instance.destructureView(currentView);
    var state = {
      targetView: name,
      title: document.title,
      __fromMvc: true
    };
    history.replaceState(state, document.title, location.href);
  })();
  
});