/*
Copyright 2017 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
goog.provide('trustedtypes.types.TrustedHTML');

/**
 * A type to represent trusted HTML.
 * @param {string} inner A piece of trusted html.
 * @param {Array<string>=} optStrings List of strings when initialized as a 
 *   template literal.
 * @param {Array<*>=} optExpressionResults List of expression results when 
 *   initialized as a template literal.
 * @constructor
 */
trustedtypes.types.TrustedHTML = function TrustedHTML(inner, optStrings,
    optExpressionResults) {
  /**
   * A piece of trusted HTML.
   * @private {string}
   */
  this.inner_ = inner;
  if (optStrings) {
    this.templateParts_ = optStrings;
    this.templateExpressionResults_ = optExpressionResults;
    this.interpolate_();
  }
};

// Workaround for Closure Compiler clearing the function name.
Object.defineProperty(trustedtypes.types.TrustedHTML, 'name', {
  get: function() {
    return 'TrustedHTML';
  },
});

/**
 * Returns a trusted HTML type that contains the HTML escaped string.
 * @param {string} html The string to escape.
 * @return {!trustedtypes.types.TrustedHTML}
 */
trustedtypes.types.TrustedHTML.escape = function(html) {
  let escaped = html.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\x00/g, '&#0;');
  return new trustedtypes.types.TrustedHTML(escaped);
};

/**
 * Returns a trusted HTML type that contains an unsafe HTML string.
 * @param {string} html The unsafe string.
 * @return {!trustedtypes.types.TrustedHTML}
 */
trustedtypes.types.TrustedHTML.unsafelyCreate = function(html) {
  return new trustedtypes.types.TrustedHTML(html);
};

/**
 * Returns the HTML as a string.
 * @return {string}
 */
trustedtypes.types.TrustedHTML.prototype.toString = function() {
  return '' + this.inner_;
};

/**
 * @private
 */
trustedtypes.types.TrustedHTML.INTERPOLATION_REGEXP_LAX_ = /\$\$\$(\d+)\$\$\$/g;

trustedtypes.types.TrustedHTML.prototype.interpolate_ = function() {
  let replaced = '';
  for (let i = 0; i < this.templateParts_.length; i++) {
    replaced += this.templateParts_[i];
    if (this.templateExpressionResults_.hasOwnProperty(i)) {
      replaced += '$$$' + i + '$$$';
    }
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(replaced, 'text/html');
  const iterator = document.createNodeIterator(doc.documentElement, -1);
  let node;

  while (node = iterator.nextNode()) {
    this.processNode_(node);
  }
  this.inner_ = doc.body.innerHTML;
};

trustedtypes.types.TrustedHTML.prototype.replaceWithExpressionResult_ =
    function(match, partId) {
  return this.templateExpressionResults_[Number(partId)];
};

trustedtypes.types.TrustedHTML.prototype.isLeafElementNode_ = function(node) {
  return node.nodeType == Node.ELEMENT_NODE &&
      node.childNodes.length == 1 &&
      node.childNodes[0].nodeType == Node.TEXT_NODE;
};

trustedtypes.types.TrustedHTML.prototype.processNode_ = function(node) {
  if (node instanceof Element) {
    [].slice.call(node.attributes).forEach((attr) => {
      if (attr.value.match(
          trustedtypes.types.TrustedHTML.INTERPOLATION_REGEXP_LAX_)) {
        attr.value = attr.value.replace(
          trustedtypes.types.TrustedHTML.INTERPOLATION_REGEXP_LAX_,
          this.replaceWithExpressionResult_.bind(this)
        );
      }
    });
  }

  if (this.isLeafElementNode_(node)) {
    let match = node.innerHTML.match(
        trustedtypes.types.TrustedHTML.INTERPOLATION_REGEXP_LAX_);
    if (match) {
      node.innerHTML = new trustedtypes.types.TrustedHTML(
        node.innerHTML.replace(
          trustedtypes.types.TrustedHTML.INTERPOLATION_REGEXP_LAX_,
          (_, partId) => {
            let value = this.templateExpressionResults_[Number(partId)];
            if (!(value instanceof window['TrustedHTML'])) {
              throw new TypeError(
                  'TrustedHTML required when interpolating into innerHTML.');
            }
            return value;
          }
      ));
    }
  }

  if (node.nodeType == Node.TEXT_NODE) {
    if (node.nodeValue.match(
        trustedtypes.types.TrustedHTML.INTERPOLATION_REGEXP_LAX_)) {
      node.nodeValue = node.nodeValue.replace(
        trustedtypes.types.TrustedHTML.INTERPOLATION_REGEXP_LAX_,
        this.replaceWithExpressionResult_.bind(this)
        );
    }
  }
};

/**
 * Creates a TrustedHTML object from a template literal.
 * Usage: 
 * TrustedHTML.fromTemplateLiteral `<div id="${id}">${interpolated} html</div>`
 * @param {!Array<string>} strings
 * @param {...*} expressions
 * @return {!trustedtypes.types.TrustedHTML}
 */
trustedtypes.types.TrustedHTML.fromTemplateLiteral =
    function(strings, ...expressions) {
  return new trustedtypes.types.TrustedHTML('', strings, expressions);
};

// Make sure Closure compiler exposes the names.
if (typeof window['TrustedHTML'] === 'undefined') {
  goog.exportProperty(window, 'TrustedHTML',
      trustedtypes.types.TrustedHTML);
  goog.exportProperty(window['TrustedHTML'], 'escape',
      trustedtypes.types.TrustedHTML.escape);
  goog.exportProperty(window['TrustedHTML'], 'unsafelyCreate',
      trustedtypes.types.TrustedHTML.unsafelyCreate);
  goog.exportProperty(window['TrustedHTML'], 'fromTemplateLiteral',
      trustedtypes.types.TrustedHTML.fromTemplateLiteral);
}
