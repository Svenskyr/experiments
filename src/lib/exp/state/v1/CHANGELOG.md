# state

## 1.0.0-dev

- Initial version. ccg-01's `_state/`, parameterized by `ExperimentDefinition` and
  `StateCookieConfig` (style guide Part 1 §9). ccg-01 still uses its own copy.
- Differs from the ccg-01 copy: cookie `path` and redirects come from the config; cookie
  `maxAge` is in seconds (7 days); an unparsable cookie counts as missing;
  `requestNextPageCookie` returns nothing.
