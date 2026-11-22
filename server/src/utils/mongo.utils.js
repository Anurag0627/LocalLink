export function isTransactionUnsupported(error) {
  const message = typeof error.message === 'string' ? error.message : '';
  return (
    (
      (error.code === 20 || error.codeName === 'IllegalOperation')
      && /transaction|replica set|mongos/i.test(message)
    )
    || /does not support retryable writes/i.test(message)
  );
}
