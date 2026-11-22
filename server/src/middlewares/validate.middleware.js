import ApiError from '../utils/ApiError.js';

function validate(schema, target = 'body') {
  return (request, _response, next) => {
    const result = schema.safeParse(request[target]);

    if (!result.success) {
      const details = result.error.issues.map(({ path, message }) => ({
        path: path.join('.'),
        message,
      }));
      return next(new ApiError(400, 'Request validation failed', details));
    }

    if (target === 'body') {
      request.validatedBody = result.data;
    } else if (target === 'query') {
      request.validatedQuery = result.data;
    } else {
      request.validatedParams = result.data;
    }
    return next();
  };
}

export default validate;
