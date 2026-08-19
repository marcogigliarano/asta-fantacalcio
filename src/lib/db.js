let getToken = async () => null;

export const configureApiAuth = (tokenGetter) => {
  getToken = tokenGetter;
};

const execute = async (query, values) => {
  const token = await getToken();
  const response = await fetch('/api/sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ query, values }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Database request failed (${response.status})`);
  }

  return response.json();
};

export const apiRequest = async (path, options = {}) => {
  const token = await getToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed (${response.status})`);
  }

  return response.json();
};

export const sql = (strings, ...values) => {
  const query = strings.reduce(
    (result, string, index) => `${result}${string}${index < values.length ? `$${index + 1}` : ''}`,
    ''
  );
  return execute(query, values);
};
