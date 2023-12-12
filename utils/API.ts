async function request<TResponse>(
  url: string,
  config: RequestInit
): Promise<TResponse> {
  const response = await fetch(url, config)
  if(response.ok) {
    const contentType = response.headers.get('content-type')
    if(contentType && contentType.indexOf('text/html') !== -1) {
      return await response.text() as TResponse
    } else if (contentType && contentType.indexOf('application/json') !== -1) {
      return await response.json() as TResponse
    } else {
      return undefined as TResponse
    }
  } else {
    throw new Error(await response.json())
  }
}

const api = {
  get: <TResponse>({url, signal, headers}: {url: string, signal?: RequestInit['signal'], headers?: {[key: string]: any} }) => 
    request<TResponse>(url, { 
      method: 'GET', 
      signal,
      headers
    }),
  post: <TBody, TResponse>({url, body, signal, headers}: {url: string, body: TBody, signal?: RequestInit['signal'], headers?: {[key: string]: any} }) => 
    request<TResponse>(
      url, {
        method: 'POST', 
        body: JSON.stringify(body), 
        headers: { 'Content-Type': 'application/json', ...headers },
        signal
      })
}

export default api