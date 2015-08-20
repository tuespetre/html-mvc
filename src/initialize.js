var descriptors = createNodeDescriptors();

Object.defineProperties(HTMLAnchorElement.prototype, descriptors.anchor_area_form);
Object.defineProperties(HTMLAreaElement.prototype, descriptors.anchor_area_form);
Object.defineProperties(HTMLFormElement.prototype, descriptors.anchor_area_form);
Object.defineProperties(HTMLInputElement.prototype, descriptors.input_button);  
Object.defineProperties(HTMLButtonElement.prototype, descriptors.input_button);
Object.defineProperties(HTMLScriptElement.prototype, descriptors.script);
Object.defineProperties(HTMLElement.prototype, descriptors.element);
Object.defineProperties(HTMLUnknownElement.prototype, descriptors.view);
Object.defineProperties(HTMLDocument.prototype, descriptors.document);

var defaultServices = {
    window:   window,
    document: document,
    history:  history,
    location: location
};
  
window.addEventListener('DOMContentLoaded', function(e) {  

  var name = document.head.querySelector('meta[name=application-name]');
    name && (name = name.content);
  var version = document.head.querySelector('meta[name=application-version]');
    version && (version = version.content);
  var mvcInternal = mvc(defaultServices, name, version);
  var mvcInstance = mvcInternal.instance;
  
  Object.defineProperty(HTMLDocument.prototype, 'mvc', {
    get: function () {
      return mvcInstance;
    }
  });

  // Find existing current view, if any, and destructure/cache it
  (function viewCaching() {
    var currentView = document.currentView;
    if (!currentView) return;
    history.replaceState({
      targetView: mvcInstance.destructureView(currentView),
      title: document.title
    }, null);
  })();
  
  // Register any declared models
  (function modelRegistration() {
    var models = document.querySelectorAll('script[type="application/json"][model]');
    for (var i = 0; i < models.length; i++) {
      var script = models[i];
      var name = script.model;
      if (name) {
        try {
          var result = JSON.parse(script.textContent);
          mvcInstance.defineModel(name, script.persistent);
          var model = mvcInstance.getModel(name);
          model.initialize(result);
        } catch (err) { }
      }
    }
  })();
  
  mvcInternal.internals.snapshotState();
  mvcInternal.internals.attach(window);
  
});