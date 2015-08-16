Object.defineProperties(HTMLAnchorElement.prototype, anchor_area_form_descriptors);
Object.defineProperties(HTMLAreaElement.prototype, anchor_area_form_descriptors);
Object.defineProperties(HTMLFormElement.prototype, anchor_area_form_descriptors);
Object.defineProperties(HTMLInputElement.prototype, input_button_descriptors);  
Object.defineProperties(HTMLButtonElement.prototype, input_button_descriptors);
Object.defineProperties(HTMLScriptElement.prototype, script_descriptors);
Object.defineProperties(HTMLElement.prototype, element_descriptors);
Object.defineProperties(HTMLUnknownElement.prototype, view_descriptors);
Object.defineProperties(HTMLDocument.prototype, document_descriptors);

window.addEventListener('DOMContentLoaded', initializeMvc);
window.addEventListener('click', extendHyperlinkNavigation);
window.addEventListener('submit', extendFormSubmission);
window.addEventListener('popstate', extendHistoryTraversal);