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
      parameters[name] = (param[1] || '').trim();
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