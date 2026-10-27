// Never retry writes: a failed response does not prove a write was not saved.
function connectionError(error, timedOut) {
  const detail = [error?.message, error?.cause?.message].filter(Boolean).join(' ');
  let code = 'E_NETWORK', message = 'تعذّر اتصال التطبيق بالخادم.';
  if (timedOut || /timeout|timed out|aborted|canceled/i.test(detail)) {
    code = 'E_TIMEOUT'; message = 'انتهت مهلة اتصال التطبيق بالخادم.';
  } else if (/ssl|certificate|certpath|trust anchor|handshake/i.test(detail)) {
    code = 'E_TLS'; message = 'تعذّر التحقق من شهادة الاتصال الآمن في أندرويد.';
  } else if (/resolve|unknownhost|name resolution|dns|hostname/i.test(detail)) {
    code = 'E_DNS'; message = 'تعذّر العثور على عنوان الخادم من التطبيق.';
  }
  const result = Error(`${message} (${code})`);
  result.code = code;
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
      } catch (error) { throw connectionError(error, timedOut); }
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
