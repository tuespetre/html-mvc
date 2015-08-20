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
    ? /^\s*bindattr-((?!bindattr|(bindsome|bindnone|bindcount|bindtext|bindhtml|bindskip|model|scope|outer|name)\s*$)[A-Za-z0-9_-]+)\s*$/
    : /^\s*bindattr-((?!bindattr|(bindsome|bindnone|bindcount|bindtext|bindhtml|bindskip)\s*$)[A-Za-z0-9_-]+)\s*$/;

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
  var didMakeHidden = false;
  if (bindHidden !== null) {
    var val = record.value(bindHidden);
    if (val === false || typeof val === 'undefined') {
      element.removeAttribute('hidden');
    }
    else {
      element.setAttribute('hidden', val);
      didMakeHidden = true;
    }
  }
  return didMakeHidden;
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

function bind_descendants (element, record) {
  var child = element.children[0];
  var views = [];
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
  return views;
}

/* Returns an array of non-hidden L1 descendant views that have yet to be bound */
function bind_element (element, record) {
  var views = [];
  
  // If 'bindskip', skip processing bindings
  if (element.bindSkip) return [];
  
  // Apply any 'hidden' binding so we know if we can skip other bindings
  if (bind_hidden(element, record)) return [];

  // If it's a view and we've already bound it, crawl through
  // descendants just to find L1 inner views
  if (is_view(element) && record === element.boundRecord) {
    return select_descendants(element, is_view, 
      function recurse (element) {
        return !element.hidden && !element.bindSome;
      });
  }
  
  bind_attributes(element, record);

  element.boundRecord = record;
  var bindText, bindHtml, bindSome, bindNone, bindCount;
  
  if (bindSome = element.bindSome) {
    var collection = record.collection(bindSome);
    if (collection.length) {
      bind_each(element, collection);
      element.hidden = false;
    }
    else {
      element.hidden = true;
    }
  }
  else if (bindNone = element.bindNone) {
    var collection = record.collection(bindNone);
    if (!collection.length) {
      views.push.apply(views, bind_descendants(element, record));
      element.hidden = false;
    }
    else {
      element.hidden = true;
    }
  }
  else if (bindCount = element.bindCount) {
    var collection = record.collection(bindCount);
    element.textContent = collection.length;
  }
  else if (bindText = element.bindText) {
    element.textContent = record.value(bindText);
  }
  else if (bindHtml = element.bindHtml) {
    element.innerHTML = record.value(bindHtml);
  }
  else {
    views.push.apply(views, bind_descendants(element, record));
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