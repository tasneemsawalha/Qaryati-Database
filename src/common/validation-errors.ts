import type { ValidationError } from 'class-validator';

// Present one useful message per invalid field without changing validation rules.
export function validationMessages(
  errors: ValidationError[],
  parent = '',
): string[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const rules = error.constraints ?? {};
    let message: string | undefined;

    if (rules.whitelistValidation) {
      message = `${field} is not allowed`;
    } else if (Object.keys(rules).length) {
      if (error.value === undefined || error.value === null) {
        message = `${field} is required`;
      } else if (
        typeof error.value === 'string' &&
        !error.value.trim() &&
        (rules.matches || rules.isNotEmpty)
      ) {
        message = `${field} must not be empty or contain only spaces`;
      } else {
        const typeRule = [
          'isString',
          'isInt',
          'isNumber',
          'isArray',
          'isEnum',
        ].find((key) => rules[key]);
        const detail = typeRule ? rules[typeRule] : Object.values(rules)[0];
        message = parent ? `${parent}.${detail}` : detail;
      }
    }

    return [
      ...(message ? [message] : []),
      ...validationMessages(error.children ?? [], field),
    ];
  });
}
