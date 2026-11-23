import { randomUUID } from 'node:crypto';

export default function requestId(request, response, next) {
  const providedId = request.get('x-request-id');
  const id = typeof providedId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(providedId)
    ? providedId
    : randomUUID();

  request.requestId = id;
  response.setHeader('X-Request-Id', id);
  next();
}
