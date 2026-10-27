// Never retry writes: a failed response does not prove a write was not saved.
function connectionError(error, timedOut, includeDiagnostic = false) {
  const details = [];
  let current = error;
  for (let depth = 0; current && depth < 4; depth++, current = current.cause) {
    if (current.message) details.push(String(current.message));
    if (current.code) details.push(String(current.code));
  }
  const detail = details.join(' ');
  let code = 'E_NETWORK', message = 'تعذّر اتصال التطبيق بالخادم.';
  if (timedOut || /timeout|timed out|aborted|canceled/i.test(detail)) {
    code = 'E_TIMEOUT'; message = 'انتهت مهلة اتصال التطبيق بالخادم.';
  } else if (/ssl|certificate|certpath|trust anchor|handshake/i.test(detail)) {
    code = 'E_TLS'; message = 'تعذّر التحقق من شهادة الاتصال الآمن في أندرويد.';
  } else if (/connection reset|reset by peer/i.test(detail)) {
    code = 'E_RESET'; message = 'تم إغلاق اتصال التطبيق بالخادم قبل استلام الرد.';
  } else if (/resolve|unknownhost|name resolution|dns|hostname/i.test(detail)) {
    code = 'E_DNS'; message = 'تعذّر العثور على عنوان الخادم من التطبيق.';
  }
  const result = Error(`${message} (${code})`);
  result.code = code;
  // Only expose native exception details for the credential-free status check.
  // Never attach request bodies, headers, tokens or login data.
  if (includeDiagnostic) result.diagnostic = detail.slice(0, 1000);
  return result;
}
function createApiRequest(transport, origin, timeoutMs = 30000) {
  return async (path, options = {}) => {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      let response;
      try {
        response = await transport(origin + path, {
          cache: 'no-store', ...options, signal: controller.signal
        });
      } catch (error) {
        const statusCheck = path === '/api/auth' && (!options.method || options.method === 'GET') &&
          !options.body && !options.headers && options.credentials === 'omit';
        throw connectionError(error, timedOut, statusCheck);
      }
      let result;
      try { result = await response.json(); }
      catch (error) {
        if (timedOut) throw connectionError(error, true);
        const invalid = Error(`تعذّر قراءة رد الخادم. (E_RESPONSE HTTP ${response.status})`);
        invalid.code = 'E_RESPONSE';
        throw invalid;
      }
      if (!response.ok) {
        const error = Error(result.error || `تعذّر الاتصال بالخادم. (HTTP ${response.status})`);
        error.status = response.status;
        throw error;
      }
      return result;
    } finally { clearTimeout(timeout); }
  };
}
module.exports = { createApiRequest, connectionError };
