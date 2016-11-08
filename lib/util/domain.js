/**
 * Kalabox domain utility module.
 * @name domain
 */

'use strict';

/**
 * Parses a string into a modified kebab case. In this instance
 * modified kebab case means
 *   1. Only alphanumeric and hyphens
 *   2. No trailing or leading hyphens
 *   3. Lowercase
 * @arg {string} string - The string to tranform
 * @example
 * var domainName = kbox.util.domain.modKebabCase('Drupal 8');
 */
exports.modKebabCase = function(string) {

  // Replace spaces with hyphens make all lowercase
  string = string.toLowerCase().replace(/\s+/g, '-');

  // Strip non-alphaNumeric but not hyphens
  string = string.replace(/[^a-z0-9-]+/gi, '');

  // Strip leading hypen if exists
  if (string.charAt(0) === '-') {
    string = string.slice(1);
  }

  // Strip trailing hyphen if exists
  if (string.charAt(string.length - 1) === '-') {
    string = string.slice(0, string.length - 2);
  }

  return string;
};

/**
 * Validates that a string is a valid FQDN. This means
 *   1. Only alphanumeric and hyphens
 *   2. No trailing or leading hyphens
 *   3. Lowercase
 *   4. Correct .* syntax
 * @arg {string} domain - The domain to check
 * @example
 * if (kbox.util.domain.validateDomain('victory.kbox')) {
 *   console.log('Valid Domain! Woohoo!');
 * };
 */
exports.validateDomain = function(domain) {
  var regex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/;
  return (domain.match(regex) !== null);
};
