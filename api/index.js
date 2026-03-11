module.exports = function(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health Check
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'ReiseRadar API läuft!',
      version: '2.0'
    });
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // API Key check
  var KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY fehlt. Bitte in Vercel Settings > Environment Variables eintragen.'
    });
  }

  // Prompt check
  var prompt = '';
  if (req.body && req.body.prompt) {
    prompt = req.body.prompt;
  }
  if (!prompt) {
    return res.status(400).json({ error: 'Kein Prompt angegeben.' });
  }

  // Call Claude API
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  })
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    // API Error
    if (data.error) {
      var errMsg = data.error.message || 'Claude API Fehler';

      // Rate limit
      if (errMsg.indexOf('rate') > -1 || errMsg.indexOf('limit') > -1) {
        return res.status(429).json({
          error: 'Zu viele Anfragen. Bitte warte 1 Minute und versuche es erneut.'
        });
      }

      // Credit
      if (errMsg.indexOf('credit') > -1 || errMsg.indexOf('billing') > -1) {
        return res.status(402).json({
          error: 'API-Guthaben aufgebraucht. Bitte auf console.anthropic.com Guthaben aufladen.'
        });
      }

      return res.status(400).json({ error: errMsg });
    }

    // Extract text from response
    var text = '';
    if (data.content && data.content.length > 0) {
      for (var i = 0; i < data.content.length; i++) {
        if (data.content[i].type === 'text' && data.content[i].text) {
          text = text + data.content[i].text;
        }
      }
    }

    if (!text) {
      return res.status(200).json({
        text: 'Keine Ergebnisse gefunden. Bitte versuche eine andere Suche.'
      });
    }

    return res.status(200).json({ text: text });
  })
  .catch(function(error) {
    // Network error
    if (error.message && error.message.indexOf('fetch') > -1) {
      return res.status(502).json({
        error: 'Verbindung zu Claude API fehlgeschlagen. Bitte spaeter erneut versuchen.'
      });
    }

    return res.status(500).json({
      error: 'Server-Fehler: ' + (error.message || 'Unbekannter Fehler')
    });
  });
};
