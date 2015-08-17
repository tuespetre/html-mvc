Object.defineProperties(HTMLAnchorElement.prototype, anchor_area_form_descriptors);
Object.defineProperties(HTMLAreaElement.prototype, anchor_area_form_descriptors);
Object.defineProperties(HTMLFormElement.prototype, anchor_area_form_descriptors);
Object.defineProperties(HTMLInputElement.prototype, input_button_descriptors);  
Object.defineProperties(HTMLButtonElement.prototype, input_button_descriptors);
Object.defineProperties(HTMLScriptElement.prototype, script_descriptors);
Object.defineProperties(HTMLElement.prototype, element_descriptors);
Object.defineProperties(HTMLUnknownElement.prototype, view_descriptors);
Object.defineProperties(HTMLDocument.prototype, document_descriptors);

window.addEventListener('DOMContentLoaded', function(e) {
  initializeMvc(window, document, history);
});
window.addEventListener('click', function(e) {
  extendHyperlinkNavigation(window, document, history, e);
});
window.addEventListener('submit', function(e) {
  extendFormSubmission(window, document, history, e);
});
window.addEventListener('popstate', function(e) {
  extendHistoryTraversal(window, document, history, e);
});