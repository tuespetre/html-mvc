function constructFormDataSet(form, submitter) {
  // HTML 5 specification (attempting to be compliant-ish)
  // 4.10.22.4 Constructing the form data set
  // Step 1
  var elems = [];
  var submittable = ['button', 'input', 'keygen', 'object', 'select', 'textarea'];
  for (var i = 0; i < target.elements.length; i++) {
    var elem = target.elements[i];
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
      (field.type === 'image' && !field.getAttribute('name'))
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

function urlEncodeFormData(data) {  
  var result = '';
  for (var i = 0; i < data.length; i++) {
    var datum = data[i];
    var value = datum.type === 'file' ? datum.value.name : datum.value;
    result += encodeURIComponent(name) + '=' + encodeURIComponent(value);
  }
  return result;
}