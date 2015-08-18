(function(window, document, history){'use strict';
// Credit: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
if (!Object.assign) {
  Object.defineProperty(Object, 'assign', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(target) {
      'use strict';
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert first argument to object');
      }

      var to = Object(target);
      for (var i = 1; i < arguments.length; i++) {
        var nextSource = arguments[i];
        if (nextSource === undefined || nextSource === null) {
          continue;
        }
        nextSource = Object(nextSource);

        var keysArray = Object.keys(Object(nextSource));
        for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
          var nextKey = keysArray[nextIndex];
          var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
          if (desc !== undefined && desc.enumerable) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
      return to;
    }
  });
}

function collection (_array) {
  _array = _array.slice(0);
  var _records = null,
      _interface = Object.create(null, {
        'items': {
          get: function () {
            return _records.map(function (r) {
              return r['interface'];
            });
          }
        }
      });

  return Object.create(null, {

    'array': {
      get: function () {
        return _array;
      }
    },

    'records': {
      get: function () {
        return _records;
      }
    },

    'initialize': {
      value: function () {
        _records = [];
        for (var i = 0; i < _array.length; i++) {
          _records[i] = record(data(_array[i]));
        }
      }
    },

    'interface': {
      get: function () {
        if (_records === null) {
          this.initialize();
        }
        return _interface;
      }
    }

  });
}

function data (_object) {
  var _scopes = {},
      _collections = {},
      _values = {};

  if (typeof _object === 'object' && !(_object instanceof Array)) {
    var validIdentifierRegex = /^[A-Za-z0-9_]+$/;
    var names = Object.getOwnPropertyNames(_object);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      if (!validIdentifierRegex.exec(name)) continue;
      var val = _object[name];
      if (val === null) continue;
      switch (typeof val) {
        case 'string':
        case 'number':
        case 'boolean':
          _values[name] = val;
          continue;
        case 'object':
          if (val instanceof Array) {
            val = val.slice(0);
            _collections[name] = collection(val);
          }
          else {
            var child = data(val);
            _scopes[name] = child;
            for (var scopeName in child.scopes) {
              var _scope = child.scopes[scopeName];
              _scopes[name + '.' + scopeName] = child.scopes[scopeName];
              for (var valueName in _scope.values) {
                _values[name + '.' + valueName] = _scope.values[valueName];
              }
            }
            for (var valueName in child.values) {
              _values[name + '.' + valueName] = child.values[valueName];
            }
            for (var collectionName in child.collections) {
              _collections[name + '.' + collectionName] = child.values[collectionName];
            }
          }
          continue;
        case 'function':
        case 'undefined':
        default:
          continue;
      }
    }
  }

  return {
    scopes: _scopes,
    collections: _collections,
    values: _values
  };
}

function record (_data) {
  var _scopes = {};

  return Object.create(null, {
  
    'values': {
      value: _data.values
    },

    'scopes': {
      value: _scopes
    },

    'collections': {
      value: _data.collections
    },

    'interface': {
      value: Object.create(null, {

        'value': {
          value: function (expr) {
            return _data.values[expr];
          }
        },

        'scope': {
          value: function (expr) {
            var scope = _scopes[expr];
            if (!scope) {
              var scopeData = _data.scopes[expr] || data({});
              scope = record(scopeData);
              _scopes[expr] = scope;
            }
            return scope['interface'];
          }
        },

        'collection': {
          value: function (expr) {
            var collection = _data.collections[expr];
            return collection ? collection['interface'].items : [];
          }
        }

      })
    }

  });
}

function merge_record (_old, _new) {
  for (var value in _old.values) {
    if (!(value in _new.values)) {
      _new.values[value] = _old.values[value];
    }
  }
  
  for (var scopeName in _old.scopes) {
    if (!(scopeName in _new.scopes)) {
      _new.scopes[scopeName] = _old.scopes[scopeName];
    }
  }

  for (var collectionName in _old.collections) {
    var _newEach = _new.collections[collectionName],
        _oldEach = _old.collections[collectionName];

    if (typeof _newEach === 'undefined') {
      _newEach = _new.collections[collectionName] = _oldEach;
    }

    if (_oldEach.records != null) {
      _newEach.initialize();
      var _records = _oldEach.records.slice(0);
      _records.splice(0, 0, 0, 0);
      Array.prototype.splice.apply(_newEach.records, _records);
    }

    var _array = _oldEach.array.slice(0);
    _array.splice(0, 0, 0, 0);
    Array.prototype.splice.apply(_newEach.array, _array);
  }

  return _new;
}

function model (_object, _onchange) {
  _object = Object.assign({}, _object);

  var state = { 
    object: _object,
    record: record(data(_object))
  };

  return Object.create(null, {
  
    'object': {
      get: function () {
        return state.object;
      }
    },

    'interface': {
      value: Object.create(null, {
      
        'initialize': {
          value: function (object) {
            state.object = Object.assign({}, object);
            state.record = record(data(state.object));
            
            if (_onchange) _onchange();
          }
        },

        'merge': {
          value: function (object) {
            var _data, _record;

            _data = Object.assign({}, object);
            _record = record(data(_data));
            state.object = Object.assign(state.object, _data);            
            state.record = merge_record(state.record, _record);              
              
            if (_onchange) _onchange();
          }
        },

        'record': {
          value: function () {
            return state.record['interface'];
          }
        }
        
      })
    }

  });
}

function viewCache (appName, appVersion) {
  var _views = {};
  // TODO: Use template string or something, it just doesn't 'feel right'
  var _keyPrefix = 'htmlmvc|views|' + 
    (appName || 'undefined').toString() + '|' + 
    (appVersion || '0').toString() + '|';

  function key(name) {
    return _keyPrefix + name;
  }

  return Object.create(null, {

    'get': {
      value: function (name) {
        var cached = _views[name];
        if (!cached) {
          var str = localStorage.getItem(key(name));
          if (str) {
            var temp = document.createElement('div');
            temp.innerHTML = str;
            cached = temp.firstChild;
            _views[name] = cached;
          }
        }
        cached && (cached = cached.cloneNode(true));
        return cached;
      }
    },

    'set': {
      value: function (name, view) {
        if (!is_view(view)) return;
        _views[name] = view.cloneNode(true);
        localStorage.setItem(key(name), view.outerHTML);
      }
    }

  });
}

function inner_views (element) {
  return select_descendants(element, is_view, not_view);
}

function processBindingAttributes (element) {
  if (element.hasAttribute('bindnone')) {
    return;
  }
  else if (element.hasAttribute('bindtext') || element.hasAttribute('bindhtml')) {
    element.innerHTML = '';
  }
  else if (element.hasAttribute('bindchildren')) {
    var bindChildren = element.bindChildren;

    if (bindChildren === Infinity || isNaN(bindChildren)) {
      for (var i = 0; i < element.children.length; i++) {
        processBindingAttributes(element.children[i]);
      }
    }
    else if (bindChildren > 0) {
      var child = element.children[bindChildren - 1];
      if (!child) return;
      while (child != element.lastChild) element.removeChild(element.lastChild);
      for (var i = 0; i < element.children.length; i++) {
        processBindingAttributes(element.children[i]);
      }
    }
    else if (bindChildren === 0) {
      element.innerHTML = '';
    }
  }
  else {
    for (var i = 0; i < element.children.length; i++) {
      processBindingAttributes(element.children[i]);
    }
  }
}

function destructureViewRecursive (view, destructured, recursion, context) {
  // Step 1. Inner views
  var innerViews = inner_views(view);
  // Step 2.
  if (!innerViews.length) return true;
  // Step 3.
  recursion = recursion.slice(0);
  // Step 4.
  var foundInnerDependent = false;
  // Step 5.
  for (var i = 0; i < innerViews.length; i++) {
    var innerView = innerViews[i];
    // Step i.
    var name = innerView.name;
    // Step ii.
    if (!name) return false;
    // Step iii.
    if (recursion.indexOf(name) !== -1) return false;
    // Step iv.
    var isDependent = false, outer = innerView.outer;
    // Step v.
    if (outer && outer != view.name) return false;
    // Step vi.
    if (outer) isDependent = true;
    // Step vii.
    if (isDependent && (foundInnerDependent || !context.resolvingOuterPath)) 
      return false;
    else
      foundInnerDependent = true;
    // Step viii.
    var marker = document.createElement('view');
    // Step ix.
    marker.setAttribute('name', name);
    // Step x.
    if (innerView.hasAttribute('scope'))
      marker.setAttribute('scope', innerView.getAttribute('scope'));
    // Step xi.
    if (isDependent) {
      marker.setAttribute('outer', innerView.outer);
      context.targetView = innerView.name;
    }
    else {
      context.targetView = undefined;
    }
    // Step xii.
    innerView.parentNode.replaceChild(marker, innerView);
    // Step xiii.
    if (!(name in destructured)) {
      innerView.removeAttribute('scope');
      destructured[name] = innerView;
      var subContext = {
        resolvingOuterPath: isDependent
      };
      var result = destructureViewRecursive(innerView, destructured, recursion, subContext);
      if (result !== true) return false;
    }
  }
  // Step 6.
  return true;
}

function destructureView (view, viewCache) {
  if (!(view instanceof HTMLElement) || view.tagName !== 'VIEW') return false;
  var name = view.name;
  if (!name) return false;
  if (view.outer) return false;
  view = view.cloneNode(true);
  processBindingAttributes(view);
  var destructuredViews = {};
  destructuredViews[name] = view;
  var recursionGuard = [];
  recursionGuard.push(name);
  var context = { 
    targetView: name, 
    resolvingOuterPath: true 
  };
  var destructuredView = destructureViewRecursive(
    view, destructuredViews, recursionGuard, context);
  if (destructuredView !== true) return false;
  for (var name in destructuredViews) {
    var destructured = destructuredViews[name];
    viewCache.set(name, destructured);
  }
  return context.targetView;
}

function restructureView (name, viewCache) {
  var cached = viewCache.get(name);
  if (!cached) return;
  // Resolve inners
  function resolveInners (view) {
    var descs = inner_views(view);
    for (var i = 0; i < descs.length; i++) {
      var inner = descs[i];
      var cached = viewCache.get(inner.name);
      if (!cached) return false;
      if (cached.outer) return false;
      cached.setAttribute('scope', inner.getAttribute('scope'));
      inner.parentNode.replaceChild(cached, inner);
      if (!resolveInners(cached)) return false;
    }
    return true;
  };

  function resolveOuters (view) {
    var outer = view.outer;
    if (!outer) return true;
    var cached = viewCache.get(outer);
    if (!cached) return false;
    var outersResolved = resolveOuters(cached);
    if (!outersResolved) return false;
    var foundGeneric = false;
    var descs = inner_views(cached);
    for (var i = 0; i < descs.length; i++) {
      var inner = descs[i];
      var innerOuter = inner.outer;
      if (innerOuter) {
        if (innerOuter != cached.name || foundGeneric) return false;
        else inner.parentNode.replaceChild(view, inner);
        foundGeneric = true;
      }
      else {
        var cached = viewCache.get(inner.name);
        if (!cached || !resolveInners(cached)) return false;
        cached.setAttribute('scope', inner.getAttribute('scope'));
        inner.parentNode.replaceChild(cached, inner);
      }
    }
    return true;
  }

  if (resolveInners(cached) && resolveOuters(cached)) {
    var result = cached;
    while (result.parentNode) result = result.parentNode
    // resolveOuters can fail due to view supplantment
    if (cached.outer && result.name !== cached.outer) return;
    return result;
  }
}

function transition_view (next, current, currentRecord, getRecord) {
  if (next.name != current.name) {
    swap_element(next, current);
    bind_views([ next ], currentRecord, getRecord);
  }
  else {
    var next_descendants    = inner_views(next),
        current_descendants = inner_views(current);
    
    if (next_descendants.length != current_descendants.length) {
      swap_element(next, current);
      bind_views([ next ], currentRecord, getRecord);
    }
    else {
      currentRecord = getRecord(current, currentRecord);
      // Just re-bind this view if necessary but don't
      // bother to collect its inner views again.
      bind_element(current, currentRecord, false);
        
      for (var i = 0; i < current_descendants.length; i++) {
        transition_view(
          next_descendants[i], 
          current_descendants[i],
          currentRecord,
          getRecord);
      }
    }
  }
}

function mvc (services, appName, appVersion) {
  var persistentModels = {},
      transientModels = {},
      cachedViews = viewCache(appName, appVersion),
      anonymous,
      instance,
      internals,
      getRecord,
      transition;
      
  anonymous = model({})['interface'];
  
  getRecord = function (view, currentRecord) {
    var modelName = view.model,
        scopeName = view.scope;
        
    return modelName
      ? this.getModel(modelName).record()
      : currentRecord && scopeName
        ? currentRecord.scope(scopeName)
        : currentRecord;
  };

  instance = Object.create(null, {

    'getModel': {
      value: function (name) {
        if (!name) return;
      
        var _model = 
          transientModels[name] || 
          persistentModels[name];

        if (!_model) {
          _model = persistentModels[name] = model({}, internals.snapshotState);
        }

        return _model['interface'];
      }
    },

    'defineModel': {
      value: function (name, persistent) {
        var modelStore = persistent === true
          ? persistentModels
          : transientModels;

        modelStore[name] = model({}, internals.snapshotState);
      }
    },

    'destructureView': {
      value: function (view) {
        return destructureView(view, cachedViews);
      }
    },

    'restructureView': {
      value: function (name) {
        return restructureView(name, cachedViews);
      }
    },

    'transitionView': {
      value: function (into, from) {
        if (!is_view(into) || !is_view(from)) return;
        transition_view(into, from, anonymous.record(), getRecord.bind(this));
      }
    },
    
    'bindView': {
      value: function (view) {
        bind_views([ view ], anonymous.record(), getRecord.bind(this));
      }
    }

  });

  internals = {
  
    attach: function (window) {
      window.addEventListener('popstate', this.extendHistoryTraversal);
      window.addEventListener('click', this.extendHyperlinkNavigation);
      window.addEventListener('submit', this.extendFormSubmission);
    },
  
    detach: function (window) {
      window.removeEventListener('popstate', this.extendHistoryTraversal);
      window.removeEventListener('click', this.extendHyperlinkNavigation);
      window.removeEventListener('submit', this.extendFormSubmission);
    },
    
    extendHistoryTraversal: function (event) {    
      var state = event.state,
          document = services.document,
          location = services.location,
          models = state.transientModels;

      if (state && state.__fromMvc === true) {
        var targetView = state.targetView,
            currentView = document.currentView,
            restructured = instance.restructureView(targetView);

        if (!restructured || !currentView) {
          location.replace(location.href);
          return;
        }
        else {
          if (typeof models === 'object') {
            transientModels = {};
            for (var name in models) {
              transientModels[name] = model(models[name], internals.snapshotState);
            }
          }
          document.title = state.title;
          instance.transitionView(restructured, currentView);
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    },
    
    extendHyperlinkNavigation: function (event) {
      var history = services.history;
      if (!('pushState' in history)) return;

      var target = event.target,
          name = target.tagName,
          currentView;

      // Handle navigation-causing clicks
      if (name === 'A' || name === 'AREA') {
        event.preventDefault();      
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
    },
    
    extendFormSubmission: function (event) {
      var location = services.location;
      var history = services.history;
      
      if (!('pushState' in history)) return;

      var target = event.target,
          name = target.tagName,
          currentView;

      if (name === 'FORM') {
        var submitter = target.__triggeringElement,
            view = submitter ? submitter.formview || target.view : target.view,
            model = submitter ? submitter.formmodel || target.model : target.model,
            action = (submitter ? submitter.formaction || target.action : target.action) || location.href,
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
        
        event.preventDefault();
        transition(
          action,
          null,
          view,
          model,
          method,
          sendRequest);
      }
    },
    
    snapshotState: function () {
      var stashedModels = {};
      
      for (var name in transientModels) {
        stashedModels[name] = transientModels[name].object;
      }
      
      var snapshot = {
        targetView: history.state.targetView,
        title: history.state.title,
        transientModels: stashedModels,
        __fromMvc: true,
        __snapshot: true
      };
      
      history.replaceState(snapshot, null);
    }  
  
  };
  
  transition = function (href, title, targetView, targetModel, method, sendRequest) {
    var location = services.location;
    var history = services.history;
    var document = services.document;
    
    function fallback() {
      location.assign(href);
    }
    
    function transition(restructuredView, currentView, newTransientModels) {
      var state = {
        targetView: targetView,
        title: title || document.title,
        __fromMvc: true
      };
      
      history.pushState(state, state.title, href);      
      transientModels = {};
      for (var name in newTransientModels) {
        var newModel = newTransientModels[name];
        instance.defineModel(name, newModel.persistent);
        var model = instance.getModel(name);
        model.initialize(newModel.object);
      }
      document.title = state.title;
      instance.transitionView(restructuredView, currentView);
      internals.snapshotState();
    }
    
    var currentView = document.currentView;
    if (!currentView) return fallback();
    
    var restructuredView = document.mvc.restructureView(targetView);
    if (!restructuredView) return fallback();

    if (targetModel) {      
      var req = new XMLHttpRequest();
      req.open(method, href);
      req.setRequestHeader('Accept', 'multipart/json');
      req.onload = function() {
        if (req.status < 200 || req.status > 299) return fallback();
        
        var type = req.getResponseHeader('Content-Type');
        var result = parseMultipartJsonResponse(type, req.responseText);
        
        if (!result[targetModel]) return fallback();
        
        transition(restructuredView, currentView, result);
      }
      req.onerror = function() {
        return fallback();
      }
      if (sendRequest) sendRequest(req);
      else return fallback();
    }
    else {
      transition(restructuredView, currentView, {});
    }

  }

  return {
    instance: instance,
    internals: internals
  };
}

function select_descendants (element, select, recurse) {
  var elements = [];
  for (var i = 0; i < element.children.length; i++) {
    var child = element.children[i];
    if (select(child)) {
      elements.push(child);
    }
    if (recurse(child)) {
      var descendants = select_descendants(child, select, recurse);
      elements.push.apply(elements, descendants);
    }
  }
  return elements;
}

function is_view (element) {
  return element.tagName === 'VIEW';
}

function not_view (element) {
  return element.tagName !== 'VIEW';
}

function swap_element(next, current) {
  current.parentNode.replaceChild(next, current);
}

function bind_attribute (element, name, value) {      
  if (value === true) {
    element.setAttribute(name, '');
  }
  else if (value === false || typeof value === 'undefined') {
    element.removeAttribute(name);
  }
  else {
    element.setAttribute(name, value);
  }
}

function bind_control (element, name, value) {
  // Should probably do some further writing and assessment
  // About how forms and their controls are to be handled.
  // Only want to work with attribute names, NOT IDL names
  // (looking at you, React.)
  if (typeof value === 'undefined') value = null;
  
  if (name === 'value' && 'value' in element) {
    element.value = value;
  }
  else if (name === 'checked' && 'checked' in element) {
    element.checked = new Boolean(value);
  }
}

function bind_attributes (element, record) {
  var pattern = element.tagName === 'VIEW'
    ? /^\s*bindattr-((?!bindattr|(bindeach|bindtext|bindhtml|bindnone|model|scope|outer|name)\s*$)[A-Za-z0-9_-]+)\s*$/
    : /^\s*bindattr-((?!bindattr|(bindeach|bindtext|bindhtml|bindnone)\s*$)[A-Za-z0-9_-]+)\s*$/;

  for (var i = 0; i < element.attributes.length; i++) {
    var attribute = element.attributes[i];
    var allowed = pattern.exec(attribute.name);
    if (!allowed) continue;
    var name = allowed[1];
    var value = record.value(attribute.value);
    bind_attribute(element, name, value);
    bind_control(element, name, value);
  }
}

function bind_hidden (element, record) {
  var bindHidden = element.getAttribute('bindattr-hidden');
  if (bindHidden !== null) {
    var val = record.value(bindHidden);
    if (val === false || typeof val === 'undefined') {
      element.removeAttribute('hidden');
    }
    else {
      element.setAttribute('hidden', val);
    }
  }
}

function bind_each (element, collection) {
  var slice = element.bindChildren;
  if (slice === Infinity || slice === 0) return;
  var childrenLength = element.children.length;
  if (childrenLength === 0) return;
  var sample = [];

  record_loop:
    for (var i = 0; i < collection.length; i++) {
      var record = collection[i];

      slice_loop:
        for (var j = 0; j < slice; j++) {
          var insert = false,
              child = element.children[(i * slice) + j],
              original = child;

          if (child && i < slice) {
            sample[j] = child.cloneNode(true);
          }
          else if (!child) {
            child = sample[j];
            if (!child) break record_loop;
            child = child.cloneNode(true);
            insert = true;
          }

          bind_element(child, record);

          if (insert) {
            var nextElem;
            if (original && (nextElem = original.nextElementSibling))
              element.insertBefore(child, nextElem);
            else
              element.appendChild(child);
          }
        }
    }

  while (element.children.length > collection.length * slice) {
    element.removeChild(element.lastChild);
  }
}

/* Returns an array of non-hidden L1 descendant views that have yet to be bound */
function bind_element (element, record) {
  var views = [];
  
  // If 'bindnone', skip processing descendants
  if (element.bindNone) return;
  
  // Apply any 'hidden' binding so we know if we can skip descendants
  bind_hidden(element, record);
  if (element.hidden) return;

  // If it's a view and we've already bound it, crawl through
  // descendants just to find L1 inner views
  if (is_view(element) && record === element.boundRecord) {
    return select_descendants(element, is_view, 
      function recurse (element) {
        return !element.hidden && !element.bindEach;
      });
  }
  
  bind_attributes(element, record);

  element.boundRecord = record;
  var bindText, bindHtml, bindEach;
  
  if (bindText = element.bindText) {
    element.textContent = record.value(bindText);
  }
  else if (bindHtml = element.bindHtml) {
    element.innerHTML = record.value(bindHtml);
  }
  else if (bindEach = element.bindEach) {
    var collection = record.collection(bindEach);
    bind_each(element, collection);
  }
  else {
    var child = element.children[0];
    if (child) {
      do {
        if (is_view(child)) {      
          views.push(child);
        }
        else {
          views.push.apply(views, bind_element(child, record));
        }
      } while (child = child.nextElementSibling);
    }
  }
  
  return views;
};

function bind_views (views, currentRecord, getRecord) {
  for (var i = 0; i < views.length; i++) {
    var view   = views[i],
        record = getRecord(view, currentRecord);
          
    bind_views(
      bind_element(view, record, true), 
      record,
      getRecord);
  }
}
// TODO: Implement actual compliant parsing algorithm
function parseContentTypeHeader(header) {
  var unquotedSemicolon = /(?!\\);/,
      matches = header.split(unquotedSemicolon),
      parameters = {};
      
  for (var i = 1; i < matches.length; i++) {
    var param = matches[i].split(/(?!\\)=/);
    var name = param[0].trim();
    if (param[1]) {
      var unquoted = param[1].replace(/(\\)?"/g, function($0, $1) { return $1 ? $0 : '' });
      parameters[name] = unquoted.trim();
    }
    else {
      parameters[name] = param[1].trim();
    }
  }
  
  return {
    type: matches[0],
    parameters: parameters
  };
}

// TODO: Implement actual compliant parsing algorithm
function parseMultipartResponseBoundary(contentType) {
  var matches = /^\s*multipart\/json;((.*?);?)boundary="?(.+?)"?(;|$)/.exec(contentType);
  
  if (matches) {
    return matches[3];
  }
}


// TODO: Implement actual compliant parsing algorithm, generators would be nice for this
function parseMultipartResponseParts(body, boundary) {
  var splitted = body.split('--' + boundary);
  var parts = [];
  for (var i = 0; i < splitted.length; i++) {
    var part = splitted[i].trim();
    if (part !== '--' && part !== '') {
      parts.push(part);
    }
  }
  return parts;
}

function parseHeaderSection(header) {
  var headerPattern = /\s*([A-Za-z_-]+)\s*:\s*(.*)$/,
      rawHeaders = header.split('\r\n'),
      headers = {};
      
  for (var i = 0; i < rawHeaders.length; i++) {
    var matches = headerPattern.exec(rawHeaders[i]);
    if (!matches) continue;
    var name = matches[1].trim();
    var value = matches[2].trim();
    headers[name] = value;
  }
  
  return headers;
}

function parseMultipartResponsePart(part) {
  var splitMessage = part.split('\r\n\r\n'),
      header = splitMessage[0], 
      body = splitMessage[1];
  
  return {
    headers: parseHeaderSection(header),
    body: body
  }
}

// Naivety central, yo
function parseMultipartJsonResponse(contentType, body) {
  var boundary = parseMultipartResponseBoundary(contentType),
      parts = parseMultipartResponseParts(body, boundary),
      models = {};
  
  gather_models:
    for (var i = 0; i < parts.length; i++) {
      var part = parseMultipartResponsePart(parts[i]);
      if (!part.body) continue gather_models;
      var contentType = part.headers['Content-Type'];
      if (!contentType) continue gather_models;
      var header = parseContentTypeHeader(contentType);
      var model = header.parameters['model'];
      if (!model) continue gather_models;
      try {
        models[model] = {
          object: JSON.parse(part.body),
          persistent: 'persistent' in header.parameters
        }
      } catch(err) {}
    }
    
  return models;
}
function constructFormDataSet(form, submitter) {
  function datalistAncestor(elem) {
    var suspect = elem;
    while (suspect = suspect.parentNode) {
      if (suspect.tagName === 'DATALIST') 
        return true;
    }
    return false;
  }

  // HTML 5 specification (attempting to be compliant-ish)
  // 4.10.22.4 Constructing the form data set
  // Step 1
  var elems = [];
  var submittable = ['BUTTON', 'INPUT', 'KEYGEN', 'OBJECT', 'SELECT', 'TEXTAREA'];
  for (var i = 0; i < form.elements.length; i++) {
    var elem = form.elements[i];
    if (submittable.indexOf(elem.tagName) == -1) continue;
    elems.push(elem);
  }
  // Step 2
  var formDataSet = [];
  // Step 3
  for (var i = 0; i < elems.length; i++) {
    var field = elems[i];
    // Step 1
    if (
      datalistAncestor(field) ||
      field.disabled ||
      (field.tagName === 'BUTTON' && submitter && field !== submitter) ||
      (field.type === 'checkbox' && !field.checked) ||
      (field.type === 'radio' && !field.checked) ||
      (field.type !== 'image' && !field.getAttribute('name'))
      // Can't really check if object is using plugin?
    ) {
      continue;
    }
    // Step 2
    var type = field.type;
    // Step 3
    // Can't really get coords?
    // Step 4
    var name = field.name;
    // Step 5
    if (field.tagName === 'SELECT') {
      for (var j = 0; j < field.options.length; j++) {
        var option = field.options[i];
        if (option.selected) formDataSet.push({
          name: name,
          type: type,
          value: option.value
        });
      }
    }
      // Step 6
    else if (field.tagName === 'INPUT' && (type === 'checkbox' || type === 'radio')) {
      formDataSet.push({
        name: name,
        type: type,
        value: field.hasAttribute('value') ? field.getAttribute('value') : 'on'
      });
    }
      // Step 7
    else if (field.tagName === 'INPUT' && field.type === 'file') {
      var files = field.files;
      if (!files || files.length === 0) {
        formDataSet.push({
          name: name,
          type: 'application/octet-stream',
          value: ''
        });
      }
      else {
        for (var j = 0; j < files.length; j++) {
          formDataSet.push({
            name: name,
            type: type,
            value: files[j]
          })
        }
      }
    }
      // Step 8
      // More <object> stuff
      // Step 9
    else {
      formDataSet.push({
        name: name,
        type: type,
        value: field.value
      });
    }
    // Step 10
    // This can be done later
  }
  // Step 4
  // newline replacement
  // Step 5
  return formDataSet;
}

function urlEncodeFormDataSet(data) {  
  var result = '';
  for (var i = 0; i < data.length; i++) {
    var datum = data[i];
    var name = datum.name;
    var value = datum.type === 'file' ? datum.value.name : datum.value;
    if (i > 0) result += '&';
    result += encodeURIComponent(name) + '=' + encodeURIComponent(value);
  }
  return result;
}
function createNodeDescriptors () {

  return {
  
    anchor_area_form: {

      'view': {
        get: function () {
          return this.getAttribute('view');
        },
        set: function (value) {
          return this.setAttribute('view', value);
        }
      },

      'model': {
        get: function () {
          return this.getAttribute('model');
        },
        set: function (value) {
          return this.setAttribute('model', value);
        }
      }

    },

    input_button: {

      'formview': {
        get: function () {
          return this.getAttribute('formview');
        },
        set: function (value) {
          return this.setAttribute('view', value);
        }
      },

      'formmodel': {
        get: function () {
          return this.getAttribute('formmodel');
        },
        set: function (value) {
          return this.setAttribute('model', value);
        }
      }

    },

    script: {

      'model': {
        get: function () {
          return this.getAttribute('model');
        }
      }
      
    },

    element: {

      'bindText': {
        get: function () {
          return this.getAttribute('bindtext');
        },
        set: function (value) {
          if (typeof value === 'undefined') {
            this.removeAttribute('bindtext');
          }
          else {
            this.setAttribute('bindtext', value);
          }
        }
      },

      'bindHtml': {
        get: function () {
          return this.getAttribute('bindhtml');
        },
        set: function (value) {
          if (typeof value === 'undefined') {
            this.removeAttribute('bindhtml');
          }
          else {
            this.setAttribute('bindhtml', value);
          }
        }
      },

      'bindEach': {
        get: function () {
          return this.getAttribute('bindeach');
        },
        set: function (value) {
          if (typeof value === 'undefined') {
            this.removeAttribute('bindeach');
          }
          else {
            this.setAttribute('bindeach', value);
          }
        }
      },

      'bindNone': {
        get: function () {
          return this.hasAttribute('bindnone');
        },
        set: function (value) {
          if (value === true) {
            this.setAttribute('bindnone', 'bindnone');
          }
          else if (value === false || typeof value === 'undefined') {
            this.removeAttribute('bindnone');
          }
        }
      },

      'bindChildren': {
        get: function () {
          var bindChildren = parseInt(this.getAttribute('bindchildren'));
          return isNaN(bindChildren) || bindChildren < 0 ? Infinity : bindChildren;
        },
        set: function (value) {
          if (isNaN(value)) {
            throw new TypeError('bindChildren must be a number');
          }
          this.setAttribute('bindchildren', value);
        }
      }

    },

    view: {

      'name': {
        get: function () {
          return this.getAttribute('name');
        },
        set: function(value) {
          if (typeof value === 'undefined') {
            this.removeAttribute('name');
          }
          else {
            this.setAttribute('name', value);
          }
        }
      },

      'outer': {
        get: function () {
          return this.getAttribute('outer');
        },
        set: function(value) {
          if (typeof value === 'undefined') {
            this.removeAttribute('outer');
          }
          else {
            this.setAttribute('outer', value);
          }
        }
      },

      'model': {
        get: function () {
          return this.getAttribute('model');
        },
        set: function(value) {
          if (typeof value === 'undefined') {
            this.removeAttribute('model');
          }
          else {
            this.setAttribute('model', value);
          }
        }
      },

      'scope': {
        get: function () {
          return this.getAttribute('scope');
        },
        set: function(value) {
          if (typeof value === 'undefined') {
            this.removeAttribute('scope');
          }
          else {
            this.setAttribute('scope', value);
          }
        }
      }

    },

    document: {

      'currentView': {
        get: function () {
          var child = this.body.firstChild;
          if (!child) return;
          do {
            if (child.nodeType === Node.ELEMENT_NODE && child.tagName === 'VIEW') {
              return child;
            }
          } while (child = child.nextSibling);
        }
      }

    }
  
  }

};
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
          mvcInstance.defineModel(name, true);
          var model = mvcInstance.getModel(name);
          model.initialize(result);
        } catch (err) { }
      }
    }
  })();
  
  mvcInternal.internals.snapshotState();
  mvcInternal.internals.attach(window);
  
});})(window, document, history);